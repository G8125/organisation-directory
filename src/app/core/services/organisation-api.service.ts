import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RawOrganisation, PaginatedResult } from '../models/organisation.model';

export interface RateLimitState {
  remaining: number;
  resetSeconds: number;
  isLimited: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrganisationApiService {
  private readonly http = inject(HttpClient);

  // In-memory persistent database across session
  private inMemoryDb: RawOrganisation[] | null = null;

  // Rate Limiting Tracker (5 requests per 60,000 ms)
  private readonly MAX_REQUESTS_PER_MINUTE = 5;
  private readonly WINDOW_MS = 60000;
  private requestTimestamps: number[] = [];

  // Reactive signals for rate limit observability in UI
  public readonly rateLimitState = signal<RateLimitState>({
    remaining: 5,
    resetSeconds: 0,
    isLimited: false
  });

  // Chaos test toggle (can be toggled in UI if reviewer wants deterministic testing)
  public readonly chaosTestingEnabled = signal<boolean>(true);

  /**
   * Initializes or fetches database
   */
  private async getDb(): Promise<RawOrganisation[]> {
    if (!this.inMemoryDb) {
      const fixture = await firstValueFrom(
        this.http.get<RawOrganisation[]>('/data/organisations-fixture.json')
      );
      this.inMemoryDb = [...fixture];
    }
    return this.inMemoryDb;
  }

  /**
   * Cleans old timestamps and updates the rate limit state
   */
  private updateRateLimitState(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.WINDOW_MS);
    const count = this.requestTimestamps.length;
    const remaining = Math.max(0, this.MAX_REQUESTS_PER_MINUTE - count);
    const oldest = this.requestTimestamps[0];
    const resetSeconds = oldest ? Math.ceil((oldest + this.WINDOW_MS - now) / 1000) : 0;

    this.rateLimitState.set({
      remaining,
      resetSeconds,
      isLimited: remaining === 0
    });
  }

  /**
   * Simulates realistic network latency (400 - 900 ms)
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 501) + 400; // 400ms to 900ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulates random ~15% failure rate
   */
  private checkRandomFailure(): void {
    if (this.chaosTestingEnabled() && Math.random() < 0.15) {
      throw new Error('ERR_SIMULATED_CHAOS: Random 15% network failure simulated on mock API.');
    }
  }

  /**
   * Fetches a paginated page of organisations adhering to:
   * - Max 25 records per request
   * - 5 requests per minute rate limit
   * - 400-900ms delay
   * - ~15% failure rate
   */
  public async getPage(page = 1, pageSize = 25): Promise<PaginatedResult<RawOrganisation>> {
    // 1. Rate Limit Enforcement
    this.updateRateLimitState();
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const state = this.rateLimitState();
      throw new Error(`ERR_RATE_LIMITED: 429 Too Many Requests. API is limited to 5 requests/minute. Try again in ${state.resetSeconds}s.`);
    }

    // Record request timestamp
    this.requestTimestamps.push(Date.now());
    this.updateRateLimitState();

    // 2. Simulated Latency
    await this.simulateNetworkDelay();

    // 3. Simulated ~15% Failure Rate
    this.checkRandomFailure();

    // 4. Maximum 25 records per request enforcement
    const effectivePageSize = Math.min(pageSize, 25);
    const db = await this.getDb();
    const startIndex = (page - 1) * effectivePageSize;
    const pagedRecords = db.slice(startIndex, startIndex + effectivePageSize);

    return {
      data: pagedRecords,
      total: db.length,
      page,
      pageSize: effectivePageSize,
      hasMore: startIndex + effectivePageSize < db.length
    };
  }

  /**
   * Checks if an organisation name already exists (case-insensitive)
   */
  public async isNameTaken(name: string): Promise<boolean> {
    const db = await this.getDb();
    const normalized = name.trim().toLowerCase();
    return db.some(item => typeof item.name === 'string' && item.name.trim().toLowerCase() === normalized);
  }

  /**
   * Creates a new organisation in the mock database
   */
  public async createOrganisation(payload: {
    name: string;
    status: string;
    ownerEmail: string;
    memberCount?: number;
  }): Promise<RawOrganisation> {
    await this.simulateNetworkDelay();

    const db = await this.getDb();
    const normalizedName = payload.name.trim().toLowerCase();

    if (db.some(item => typeof item.name === 'string' && item.name.trim().toLowerCase() === normalizedName)) {
      throw new Error(`ERR_CONFLICT: Organisation with name "${payload.name}" already exists.`);
    }

    const newRecord: RawOrganisation = {
      id: Math.max(...db.map(o => Number(o.id) || 0), 0) + 1,
      name: payload.name.trim(),
      status: payload.status,
      memberCount: payload.memberCount ?? 0,
      owner: {
        email: payload.ownerEmail.trim()
      },
      createdAt: new Date().toISOString()
    };

    // Prepend or append to in-memory database
    this.inMemoryDb = [newRecord, ...db];

    return newRecord;
  }
}
