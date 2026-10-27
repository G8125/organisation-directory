import { Injectable, inject, signal, computed } from '@angular/core';
import { OrganisationApiService } from './organisation-api.service';
import { OrganisationAdapter } from '../adapters/organisation.adapter';
import {
  RawOrganisation,
  CleanOrganisation,
  OrganisationStatus,
  SortField,
  SortDirection
} from '../models/organisation.model';

@Injectable({
  providedIn: 'root'
})
export class OrganisationStoreService {
  private readonly api = inject(OrganisationApiService);

  // Raw API records state
  private readonly rawOrganisations = signal<RawOrganisation[]>([]);

  // Sanitized domain records computed via OrganisationAdapter
  public readonly allOrganisations = computed<CleanOrganisation[]>(() => {
    return OrganisationAdapter.transformAll(this.rawOrganisations());
  });

  // UI & Network state signals
  public readonly isLoading = signal<boolean>(false);
  public readonly isProgressiveLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly totalRecords = signal<number>(0);
  public readonly currentPage = signal<number>(1);
  public readonly hasMore = signal<boolean>(false);

  // Rate Limiting signals from API
  public readonly rateLimitState = this.api.rateLimitState;
  public readonly chaosTestingEnabled = this.api.chaosTestingEnabled;

  // Filter & Search Signals
  public readonly searchTerm = signal<string>('');
  public readonly statusFilter = signal<OrganisationStatus | 'all'>('all');
  public readonly sortField = signal<SortField>('name');
  public readonly sortDirection = signal<SortDirection>('asc');

  // Conflict 2: Display mode toggle ('accessible-dot' vs 'full-pill')
  public readonly statusDisplayMode = signal<'accessible-dot' | 'full-pill'>('accessible-dot');

  // Reviewer Brand Switcher signal ('default' | 'indigo' | 'teal' | 'purple' | 'emerald')
  public readonly brandTheme = signal<string>('default');

  // Computed Filtered & Sorted Organisations for the table
  public readonly visibleOrganisations = computed<CleanOrganisation[]>(() => {
    const list = this.allOrganisations();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const sortField = this.sortField();
    const isAsc = this.sortDirection() === 'asc';

    // 1. Filter by Status
    let filtered = list;
    if (status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }

    // 2. Free-text search on Name
    if (query.length > 0) {
      filtered = filtered.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query) ||
                          item.displayName.toLowerCase().includes(query);
        return nameMatch;
      });
    }

    // 3. Sort by Name, Created Date, or Member Count
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        // Handle missing/empty names safely
        if (a.isNameMissing && !b.isNameMissing) return 1;
        if (!a.isNameMissing && b.isNameMissing) return -1;
        if (a.isNameMissing && b.isNameMissing) return 0;

        comparison = a.name.localeCompare(b.name, undefined, {
          sensitivity: 'base',
          numeric: true
        });
      } else if (sortField === 'createdAt') {
        // Handle unparseable/missing dates safely
        if (!a.createdAt && b.createdAt) return 1;
        if (a.createdAt && !b.createdAt) return -1;
        if (!a.createdAt && !b.createdAt) return 0;

        const timeA = a.createdAt!.getTime();
        const timeB = b.createdAt!.getTime();
        comparison = timeA - timeB;
      } else if (sortField === 'memberCount') {
        comparison = a.memberCount - b.memberCount;
      }

      return isAsc ? comparison : -comparison;
    });
  });

  /**
   * Computed anomaly counts across currently loaded dataset
   */
  public readonly anomalyStats = computed(() => {
    const orgs = this.allOrganisations();
    let duplicateIds = 0;
    let missingNames = 0;
    let unparseableDates = 0;
    let invalidEmails = 0;
    let normalizedTypos = 0;

    for (const org of orgs) {
      for (const anomaly of org.anomalies) {
        if (anomaly === 'DUPLICATE_ID') duplicateIds++;
        if (anomaly === 'MISSING_NAME') missingNames++;
        if (anomaly === 'UNPARSEABLE_DATE') unparseableDates++;
        if (anomaly === 'INVALID_EMAIL') invalidEmails++;
        if (anomaly === 'NORMALIZED_STATUS_TYPO') normalizedTypos++;
      }
    }

    return { duplicateIds, missingNames, unparseableDates, invalidEmails, normalizedTypos };
  });

  /**
   * Conflict 1 Resolution:
   * Progressive single-page streaming loader that satisfies ops team desire
   * for zero pagination clicks while strictly respecting the 25 items/req and 5 req/min API ceiling.
   */
  public async loadInitial(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const pageResult = await this.api.getPage(1, 25);
      this.rawOrganisations.set(pageResult.data);
      this.totalRecords.set(pageResult.total);
      this.currentPage.set(1);
      this.hasMore.set(pageResult.hasMore);
      this.isLoading.set(false);

      // Trigger background streaming of subsequent pages if more exist
      if (pageResult.hasMore) {
        this.streamNextPages();
      }
    } catch (err: unknown) {
      this.isLoading.set(false);
      this.error.set(err instanceof Error ? err.message : 'Unknown network failure');
    }
  }

  /**
   * Continuously streams remaining records into the single page viewport
   * with rate-limit backoff handling.
   */
  public async streamNextPages(): Promise<void> {
    if (this.isProgressiveLoading() || !this.hasMore()) return;

    this.isProgressiveLoading.set(true);

    try {
      while (this.hasMore()) {
        const nextPage = this.currentPage() + 1;
        const rateState = this.rateLimitState();

        // If rate limit reached, wait for cooldown before requesting next chunk
        if (rateState.isLimited && rateState.resetSeconds > 0) {
          await new Promise(resolve => setTimeout(resolve, (rateState.resetSeconds + 1) * 1000));
        }

        try {
          const nextResult = await this.api.getPage(nextPage, 25);
          this.rawOrganisations.update(current => [...current, ...nextResult.data]);
          this.currentPage.set(nextPage);
          this.hasMore.set(nextResult.hasMore);
        } catch (innerErr: unknown) {
          const msg = innerErr instanceof Error ? innerErr.message : '';
          if (msg.includes('ERR_RATE_LIMITED')) {
            // Wait out rate limit and retry this page
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          } else {
            console.warn('[Stream] Non-blocking background fetch notice:', innerErr);
            // Break stream on fatal error so user can still interact with already loaded items
            break;
          }
        }
      }
    } finally {
      this.isProgressiveLoading.set(false);
    }
  }

  /**
   * Retry loading after an error
   */
  public retry(): void {
    if (this.rawOrganisations().length === 0) {
      this.loadInitial();
    } else {
      this.error.set(null);
      this.streamNextPages();
    }
  }

  /**
   * Adds an organisation directly into state and API
   */
  public async createOrganisation(data: {
    name: string;
    status: string;
    ownerEmail: string;
    memberCount?: number;
  }): Promise<void> {
    const raw = await this.api.createOrganisation(data);
    this.rawOrganisations.update(current => [raw, ...current]);
    this.totalRecords.update(n => n + 1);
  }

  public setBrandTheme(theme: string): void {
    this.brandTheme.set(theme);
    if (typeof document !== 'undefined') {
      if (theme === 'default') {
        document.documentElement.removeAttribute('data-brand');
      } else {
        document.documentElement.setAttribute('data-brand', theme);
      }
    }
  }

  public toggleStatusDisplayMode(): void {
    this.statusDisplayMode.update(mode => mode === 'accessible-dot' ? 'full-pill' : 'accessible-dot');
  }

  public toggleChaosTesting(): void {
    this.api.chaosTestingEnabled.update(v => !v);
  }
}
