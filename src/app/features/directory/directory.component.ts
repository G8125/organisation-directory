import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { OrganisationStoreService } from '../../core/services/organisation-store.service';
import { CleanOrganisation, OrganisationStatus, SortField, SortDirection } from '../../core/models/organisation.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CreateOrgDialogComponent } from './components/create-org-dialog/create-org-dialog.component';
import { DecisionsDialogComponent } from './components/decisions-dialog/decisions-dialog.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    CreateOrgDialogComponent,
    DecisionsDialogComponent,
    TranslatePipe
  ],
  template: `
    <div class="directory-container">
      <!-- Top Overview Bar -->
      <header class="directory-header">
        <div class="header-main">
          <div class="header-titles">
            <div class="title-with-badge">
              <h1 class="page-title">{{ 'app.title' | translate }}</h1>
              <span class="badge-ops">{{ 'app.badge_ops' | translate }}</span>
            </div>
            <p class="page-subtitle">{{ 'app.subtitle' | translate }}</p>
          </div>

          <!-- Actions -->
          <div class="header-actions">
            <!-- Reviewer Decisions Modal Button -->
            <button
              type="button"
              class="btn-decisions"
              (click)="showDecisionsModal.set(true)"
              [attr.aria-label]="'app.view_decisions' | translate"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="icon-btn" aria-hidden="true">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <span>{{ 'app.view_decisions' | translate }}</span>
            </button>

            <!-- Add Organisation Button (FR3) -->
            <button
              type="button"
              class="btn-primary"
              (click)="showCreateModal.set(true)"
              id="btn-add-org"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="icon-btn" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              <span>{{ 'form.trigger_button' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Architectural Conflict Resolution & Live Rate Limit Tracker Banner -->
        <div class="conflict-banner">
          <div class="banner-left">
            <span class="banner-chip chip-rate">
              <svg viewBox="0 0 20 20" fill="currentColor" class="chip-icon" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
              @if (store.rateLimitState().isLimited) {
                <span class="rate-warning">{{ 'rate_limit.status_waiting' | translate:{ seconds: store.rateLimitState().resetSeconds } }}</span>
              } @else {
                <span>{{ 'rate_limit.status_ready' | translate:{ remaining: store.rateLimitState().remaining } }}</span>
              }
            </span>

            <span class="banner-chip chip-buffer">
              <span>{{ 'rate_limit.buffer_progress' | translate:{ loaded: store.allOrganisations().length, total: store.totalRecords() } }}</span>
              @if (store.isProgressiveLoading()) {
                <span class="pulse-dot" title="Streaming pages in background..."></span>
              }
            </span>

            <!-- Chaos test toggle for reviewer -->
            <button
              type="button"
              class="btn-chaos"
              [class.active]="store.chaosTestingEnabled()"
              (click)="store.toggleChaosTesting()"
              title="Toggle 15% random failure rate"
            >
              <span>{{ 'states.simulated_badge' | translate }}: {{ store.chaosTestingEnabled() ? 'ON' : 'OFF' }}</span>
            </button>
          </div>

          <div class="banner-right">
            <!-- Conflict 2 Mode Toggle: Accessible Dot vs Full Pill -->
            <div class="mode-toggle-group">
              <span class="toggle-label">{{ 'conflicts.toggle_status_mode' | translate }}:</span>
              <button
                type="button"
                class="btn-toggle"
                [class.active]="store.statusDisplayMode() === 'accessible-dot'"
                (click)="store.statusDisplayMode.set('accessible-dot')"
              >
                {{ 'conflicts.mode_accessible_dot' | translate }}
              </button>
              <button
                type="button"
                class="btn-toggle"
                [class.active]="store.statusDisplayMode() === 'full-pill'"
                (click)="store.statusDisplayMode.set('full-pill')"
              >
                {{ 'conflicts.mode_full_pill' | translate }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Filter & Search Toolbar (FR2 compliant & URL synchronized) -->
      <section class="toolbar-section" aria-label="Filters and Search">
        <div class="toolbar-grid">
          <!-- Debounced Search Input -->
          <div class="search-box">
            <label for="search-input" class="sr-only">{{ 'filters.search_label' | translate }}</label>
            <div class="search-input-wrapper">
              <svg viewBox="0 0 20 20" fill="currentColor" class="search-icon" aria-hidden="true">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
              <input
                id="search-input"
                type="search"
                class="search-input"
                [ngModel]="searchQuery"
                (ngModelChange)="onSearchInputChange($event)"
                [placeholder]="'filters.search_placeholder' | translate"
              />
              @if (searchQuery) {
                <button
                  type="button"
                  class="btn-clear-search"
                  (click)="clearSearch()"
                  aria-label="Clear search input"
                >
                  &times;
                </button>
              }
            </div>
          </div>

          <!-- Status Filter Dropdown -->
          <div class="filter-box">
            <label for="status-filter" class="filter-label">{{ 'filters.status_label' | translate }}:</label>
            <select
              id="status-filter"
              class="filter-select"
              [ngModel]="store.statusFilter()"
              (ngModelChange)="onStatusFilterChange($event)"
            >
              <option value="all">{{ 'filters.all_statuses' | translate }}</option>
              <option value="active">{{ 'filters.status_active' | translate }}</option>
              <option value="inactive">{{ 'filters.status_inactive' | translate }}</option>
              <option value="suspended">{{ 'filters.status_suspended' | translate }}</option>
              <option value="unknown">{{ 'filters.status_unknown' | translate }}</option>
            </select>
          </div>

          <!-- Results counter & active filters clear -->
          <div class="results-count-box">
            <span class="results-count">
              @if (store.visibleOrganisations().length === 1) {
                {{ 'filters.results_count_singular' | translate }}
              } @else {
                {{ 'filters.results_count_plural' | translate:{ count: store.visibleOrganisations().length } }}
              }
              <span class="count-total">({{ 'filters.results_total' | translate:{ total: store.allOrganisations().length } }})</span>
            </span>

            @if (searchQuery || store.statusFilter() !== 'all') {
              <button type="button" class="btn-clear-filters" (click)="resetAllFilters()">
                {{ 'filters.clear_filters' | translate }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Main Directory Content States (FR4 compliant) -->
      <main class="table-card">
        <!-- 1. LOADING STATE -->
        @if (store.isLoading()) {
          <div class="state-container loading-state" role="status" aria-live="polite">
            <div class="spinner-large" aria-hidden="true"></div>
            <h2 class="state-title">{{ 'states.loading_title' | translate }}</h2>
            <p class="state-desc">{{ 'states.loading_desc' | translate }}</p>
          </div>
        }

        <!-- 2. ERROR STATE (Simulated 15% failure rate handling) -->
        @else if (store.error()) {
          <div class="state-container error-state" role="alert" aria-live="assertive">
            <div class="state-icon error-icon-wrapper" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-lg">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 class="state-title">{{ 'states.error_title' | translate }}</h2>
            <p class="state-desc">{{ store.error() }}</p>
            <button type="button" class="btn-retry" (click)="store.retry()">
              <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sm" aria-hidden="true">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
              <span>{{ 'states.error_retry' | translate }}</span>
            </button>
          </div>
        }

        <!-- 3. EMPTY STATE -->
        @else if (store.visibleOrganisations().length === 0) {
          <div class="state-container empty-state">
            <div class="state-icon empty-icon-wrapper" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="icon-lg">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h2 class="state-title">{{ 'states.empty_title' | translate }}</h2>
            <p class="state-desc">{{ 'states.empty_desc' | translate }}</p>
            <button type="button" class="btn-secondary" (click)="resetAllFilters()">
              {{ 'states.empty_action' | translate }}
            </button>
          </div>
        }

        <!-- 4. DATA TABLE (FR1 compliant: name, status, member count, owner, created date) -->
        @else {
          <div class="table-scroll-wrapper">
            <table class="org-table" aria-describedby="table-caption">
              <caption id="table-caption" class="sr-only">{{ 'table.caption' | translate }}</caption>
              <thead>
                <tr>
                  <!-- Sortable Name Column -->
                  <th scope="col" class="th-name" (click)="toggleSort('name')" [attr.aria-sort]="getAriaSort('name')">
                    <button type="button" class="th-sort-btn">
                      <span>{{ 'table.col_name' | translate }}</span>
                      <span class="sort-icon-wrapper">
                        @if (store.sortField() === 'name') {
                          @if (store.sortDirection() === 'asc') {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
                          } @else {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                          }
                        } @else {
                          <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort inactive" aria-hidden="true"><path d="M5 10l5-5 5 5H5zm0 2l5 5 5-5H5z"/></svg>
                        }
                      </span>
                    </button>
                  </th>

                  <!-- Status Column -->
                  <th scope="col" class="th-status">
                    <span>{{ 'table.col_status' | translate }}</span>
                  </th>

                  <!-- Sortable Member Count Column -->
                  <th scope="col" class="th-members" (click)="toggleSort('memberCount')" [attr.aria-sort]="getAriaSort('memberCount')">
                    <button type="button" class="th-sort-btn">
                      <span>{{ 'table.col_members' | translate }}</span>
                      <span class="sort-icon-wrapper">
                        @if (store.sortField() === 'memberCount') {
                          @if (store.sortDirection() === 'asc') {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
                          } @else {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                          }
                        } @else {
                          <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort inactive" aria-hidden="true"><path d="M5 10l5-5 5 5H5zm0 2l5 5 5-5H5z"/></svg>
                        }
                      </span>
                    </button>
                  </th>

                  <!-- Owner Column -->
                  <th scope="col" class="th-owner">
                    <span>{{ 'table.col_owner' | translate }}</span>
                  </th>

                  <!-- Sortable Created Date Column -->
                  <th scope="col" class="th-created" (click)="toggleSort('createdAt')" [attr.aria-sort]="getAriaSort('createdAt')">
                    <button type="button" class="th-sort-btn">
                      <span>{{ 'table.col_created' | translate }}</span>
                      <span class="sort-icon-wrapper">
                        @if (store.sortField() === 'createdAt') {
                          @if (store.sortDirection() === 'asc') {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
                          } @else {
                            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort active" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                          }
                        } @else {
                          <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sort inactive" aria-hidden="true"><path d="M5 10l5-5 5 5H5zm0 2l5 5 5-5H5z"/></svg>
                        }
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <!-- Standalone New Control Flow @for with unique uiKey tracking (handles duplicate IDs safely) -->
                @for (org of store.visibleOrganisations(); track org.uiKey) {
                  <tr class="org-row">
                    <!-- Name Cell (Handles long strings, RTL Unicode, emojis, empty name fallback) -->
                    <td class="td-name">
                      <div class="name-container">
                        <span
                          class="org-name-text"
                          [class.name-missing]="org.isNameMissing"
                          dir="auto"
                          [title]="org.displayName"
                        >
                          {{ org.displayName }}
                        </span>

                        <!-- Anomaly Flag if quirks detected -->
                        @if (org.anomalies.length > 0) {
                          <span
                            class="anomaly-indicator"
                            [title]="getAnomalyTooltip(org)"
                            [attr.aria-label]="getAnomalyTooltip(org)"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" class="icon-warning-tiny" aria-hidden="true">
                              <path fill-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4a1 1 0 012 0v5a1 1 0 11-2 0V4zm1 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                            </svg>
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Status Cell (Conflict 2 resolution component) -->
                    <td class="td-status">
                      <app-status-badge
                        [status]="org.status"
                        [mode]="store.statusDisplayMode()"
                      />
                    </td>

                    <!-- Member Count Cell (Handles string numbers, negative values, null) -->
                    <td class="td-members">
                      <span class="members-badge">
                        @if (!org.isMemberCountValid && org.memberCount === 0) {
                          <span class="text-faint">{{ 'table.members_zero' | translate }}</span>
                        } @else if (org.memberCount === 1) {
                          {{ 'table.members_one' | translate }}
                        } @else {
                          {{ 'table.members_many' | translate:{ count: org.memberCount } }}
                        }
                      </span>
                    </td>

                    <!-- Owner Cell (Handles invalid email strings, missing owner object, copy helper) -->
                    <td class="td-owner">
                      @if (org.ownerEmail) {
                        <div class="owner-container">
                          @if (org.isOwnerEmailValid) {
                            <a [href]="'mailto:' + org.ownerEmail" class="owner-email-link" [title]="org.ownerEmail">
                              {{ org.ownerEmail }}
                            </a>
                            <button
                              type="button"
                              class="btn-copy-email"
                              (click)="copyToClipboard(org.ownerEmail)"
                              [attr.aria-label]="'table.copy_email' | translate"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" class="icon-copy" aria-hidden="true">
                                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-2V7a1 1 0 00-1-1H6a1 1 0 00-1 1v8h4v2H5a2 2 0 01-2-2V5z" />
                                <path d="M12 9a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1V9z" />
                              </svg>
                            </button>
                          } @else {
                            <span class="invalid-email-badge" [title]="'table.invalid_email' | translate:{ email: org.ownerEmail }">
                              {{ org.ownerEmail }} (Invalid)
                            </span>
                          }
                        </div>
                      } @else {
                        <span class="text-faint">{{ 'table.no_owner' | translate }}</span>
                      }
                    </td>

                    <!-- Created Date Cell (Handles epoch timestamps, ISO strings, invalid dates) -->
                    <td class="td-created">
                      @if (org.isCreatedAtValid && org.createdAt) {
                        <span class="created-date" [title]="org.createdAtIso">
                          {{ formatDate(org.createdAt) }}
                        </span>
                      } @else {
                        <span class="text-faint">{{ 'table.unknown_date' | translate }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </main>

      <!-- Toast Notification for Successful Create -->
      @if (successToast()) {
        <aside class="toast-notification" role="status" aria-live="polite">
          <svg viewBox="0 0 20 20" fill="currentColor" class="icon-toast" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>{{ 'form.toast_success' | translate:{ name: successToast()! } }}</span>
        </aside>
      }

      <!-- Create Organisation Modal Dialog -->
      @if (showCreateModal()) {
        <app-create-org-dialog
          (closed)="showCreateModal.set(false)"
          (created)="onOrganisationCreated($event)"
        />
      }

      <!-- Decisions Modal Dialog -->
      @if (showDecisionsModal()) {
        <app-decisions-dialog
          (closed)="showDecisionsModal.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    .directory-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--space-xl) var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    /* Header */
    .directory-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: var(--space-md);
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .page-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-main);
      letter-spacing: -0.02em;
    }

    .badge-ops {
      background-color: var(--color-brand-light);
      color: var(--color-brand);
      border: 1px solid var(--color-brand-border);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      padding: var(--space-3xs) var(--space-xs);
      border-radius: var(--radius-full);
    }

    .page-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-2xs);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .btn-decisions {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      background: var(--color-surface-card);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      color: var(--color-text-main);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition: all 0.15s ease;
    }

    .btn-decisions:hover {
      background: var(--color-surface-card-hover);
      border-color: var(--color-brand);
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      background: var(--color-brand);
      color: var(--color-brand-contrast);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition: background 0.15s ease;
    }

    .btn-primary:hover {
      background: var(--color-brand-hover);
    }

    .icon-btn {
      width: 18px;
      height: 18px;
    }

    /* Conflict & Architecture Banner */
    .conflict-banner {
      background-color: var(--color-surface-card);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-xs) var(--space-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-sm);
      box-shadow: var(--shadow-xs);
    }

    .banner-left, .banner-right {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .banner-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: var(--font-size-xs);
      padding: var(--space-3xs) var(--space-sm);
      border-radius: var(--radius-full);
      font-weight: var(--font-weight-medium);
    }

    .chip-rate {
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-subtle);
    }

    .rate-warning {
      color: var(--color-danger);
      font-weight: var(--font-weight-semibold);
    }

    .chip-buffer {
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-subtle);
    }

    .chip-icon {
      width: 14px;
      height: 14px;
      color: var(--color-text-muted);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-brand);
      animation: pulseAnim 1.5s infinite ease-in-out;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.9); opacity: 0.5; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.5; }
    }

    .btn-chaos {
      font-size: var(--font-size-xs);
      padding: var(--space-3xs) var(--space-xs);
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface-card);
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .btn-chaos.active {
      border-color: var(--color-brand);
      color: var(--color-brand);
      font-weight: var(--font-weight-semibold);
    }

    .mode-toggle-group {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      background: var(--color-surface-alt);
      padding: var(--space-3xs);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .toggle-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-left: var(--space-xs);
    }

    .btn-toggle {
      font-size: var(--font-size-xs);
      padding: var(--space-3xs) var(--space-xs);
      border-radius: var(--radius-sm);
      border: none;
      background: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-weight: var(--font-weight-medium);
      transition: all 0.15s ease;
    }

    .btn-toggle.active {
      background: var(--color-surface-card);
      color: var(--color-text-main);
      box-shadow: var(--shadow-xs);
      font-weight: var(--font-weight-semibold);
    }

    /* Toolbar: Search and Filter */
    .toolbar-section {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      box-shadow: var(--shadow-xs);
    }

    .toolbar-grid {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-md);
    }

    .search-box {
      flex: 1 1 300px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: var(--space-sm);
      width: 18px;
      height: 18px;
      color: var(--color-text-faint);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: var(--space-xs) var(--space-xl) var(--space-xs) calc(var(--space-sm) + 24px);
      font-size: var(--font-size-sm);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface-card);
      color: var(--color-text-main);
      font-family: inherit;
      transition: all 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--color-brand);
      box-shadow: var(--shadow-focus);
    }

    .btn-clear-search {
      position: absolute;
      right: var(--space-xs);
      background: none;
      border: none;
      font-size: var(--font-size-lg);
      line-height: 1;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: var(--space-3xs) var(--space-2xs);
    }

    .filter-box {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .filter-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .filter-select {
      padding: var(--space-xs) var(--space-md);
      font-size: var(--font-size-sm);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface-card);
      color: var(--color-text-main);
      cursor: pointer;
      font-family: inherit;
    }

    .filter-select:focus {
      border-color: var(--color-brand);
      box-shadow: var(--shadow-focus);
    }

    .results-count-box {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-left: auto;
    }

    .results-count {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }

    .count-total {
      color: var(--color-text-muted);
    }

    .btn-clear-filters {
      background: none;
      border: none;
      color: var(--color-brand);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      text-decoration: underline;
    }

    /* Table Card & Layout */
    .table-card {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }

    .table-scroll-wrapper {
      overflow-x: auto;
      max-height: calc(100vh - 360px);
      overflow-y: auto;
    }

    .org-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .org-table thead {
      position: sticky;
      top: 0;
      background: var(--color-surface-alt);
      z-index: 10;
      border-bottom: 1px solid var(--color-border-strong);
    }

    .org-table th {
      padding: var(--space-sm) var(--space-md);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .th-sort-btn {
      background: none;
      border: none;
      font: inherit;
      color: inherit;
      text-transform: inherit;
      letter-spacing: inherit;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2xs);
      cursor: pointer;
      padding: 0;
      width: 100%;
    }

    .sort-icon-wrapper {
      display: inline-flex;
      align-items: center;
    }

    .icon-sort {
      width: 14px;
      height: 14px;
    }

    .icon-sort.active {
      color: var(--color-brand);
    }

    .icon-sort.inactive {
      color: var(--color-text-faint);
    }

    .org-row {
      border-bottom: 1px solid var(--color-border-subtle);
      transition: background-color 0.12s ease;
    }

    .org-row:hover {
      background-color: var(--color-surface-card-hover);
    }

    .org-table td {
      padding: var(--space-sm) var(--space-md);
      font-size: var(--font-size-sm);
      color: var(--color-text-main);
      vertical-align: middle;
    }

    /* Name Column */
    .th-name {
      min-width: 280px;
    }

    .name-container {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      max-width: 440px;
    }

    .org-name-text {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .name-missing {
      color: var(--color-text-muted);
      font-style: italic;
    }

    .anomaly-indicator {
      display: inline-flex;
      align-items: center;
      color: #d97706;
      cursor: help;
      flex-shrink: 0;
    }

    .icon-warning-tiny {
      width: 15px;
      height: 15px;
    }

    /* Status Column */
    .th-status {
      min-width: 130px;
    }

    /* Members Column */
    .th-members {
      min-width: 120px;
    }

    .members-badge {
      font-variant-numeric: tabular-nums;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
    }

    /* Owner Column */
    .th-owner {
      min-width: 220px;
    }

    .owner-container {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      max-width: 260px;
    }

    .owner-email-link {
      color: var(--color-brand);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: var(--font-size-xs);
    }

    .owner-email-link:hover {
      text-decoration: underline;
    }

    .btn-copy-email {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 2px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
    }

    .btn-copy-email:hover {
      color: var(--color-text-main);
      background: var(--color-border-subtle);
    }

    .icon-copy {
      width: 14px;
      height: 14px;
    }

    .invalid-email-badge {
      font-size: var(--font-size-xs);
      color: var(--color-danger);
      background: var(--color-danger-bg);
      border: 1px solid var(--color-danger-border);
      border-radius: var(--radius-sm);
      padding: 1px var(--space-xs);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Created Column */
    .th-created {
      min-width: 140px;
    }

    .created-date {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .text-faint {
      color: var(--color-text-faint);
      font-size: var(--font-size-xs);
      font-style: italic;
    }

    /* States (Loading, Error, Empty) */
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl) var(--space-lg);
      text-align: center;
      gap: var(--space-sm);
      flex: 1;
    }

    .state-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-main);
    }

    .state-desc {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      max-width: 440px;
    }

    .spinner-large {
      width: 42px;
      height: 42px;
      border: 3px solid var(--color-border-strong);
      border-top-color: var(--color-brand);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .state-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-icon-wrapper {
      background-color: var(--color-danger-bg);
      color: var(--color-danger);
    }

    .empty-icon-wrapper {
      background-color: var(--color-surface-alt);
      color: var(--color-text-muted);
    }

    .icon-lg {
      width: 28px;
      height: 28px;
    }

    .btn-retry {
      margin-top: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      background: var(--color-brand);
      color: var(--color-brand-contrast);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .btn-retry:hover {
      background: var(--color-brand-hover);
    }

    .btn-secondary {
      margin-top: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      background: var(--color-surface-card);
      color: var(--color-text-main);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: var(--color-surface-card-hover);
    }

    /* Toast Notification */
    .toast-notification {
      position: fixed;
      bottom: var(--space-xl);
      right: var(--space-xl);
      background: var(--color-text-main);
      color: #ffffff;
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      z-index: 1000;
      animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes toastIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .icon-toast {
      width: 20px;
      height: 20px;
      color: #34d399;
      flex-shrink: 0;
    }
  `]
})
export class DirectoryComponent implements OnInit, OnDestroy {
  public readonly store = inject(OrganisationStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translationService = inject(TranslationService);

  public searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private routeSub?: Subscription;

  public readonly showCreateModal = signal<boolean>(false);
  public readonly showDecisionsModal = signal<boolean>(false);
  public readonly successToast = signal<string | null>(null);

  ngOnInit(): void {

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.store.searchTerm.set(query);
      this.updateUrlParams();
    });


    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') || '';
      const status = (params.get('status') as OrganisationStatus | 'all') || 'all';
      const sort = (params.get('sort') as SortField) || 'name';
      const dir = (params.get('dir') as SortDirection) || 'asc';

      this.searchQuery = q;
      this.store.searchTerm.set(q);
      this.store.statusFilter.set(status);
      this.store.sortField.set(sort);
      this.store.sortDirection.set(dir);
    });


    this.store.loadInitial();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  public onSearchInputChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  public onStatusFilterChange(status: OrganisationStatus | 'all'): void {
    this.store.statusFilter.set(status);
    this.updateUrlParams();
  }

  public resetAllFilters(): void {
    this.searchQuery = '';
    this.store.searchTerm.set('');
    this.store.statusFilter.set('all');
    this.updateUrlParams();
  }

  public toggleSort(field: SortField): void {
    if (this.store.sortField() === field) {

      this.store.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.store.sortField.set(field);
      this.store.sortDirection.set('asc');
    }
    this.updateUrlParams();
  }

  public getAriaSort(field: SortField): 'ascending' | 'descending' | 'none' {
    if (this.store.sortField() !== field) return 'none';
    return this.store.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  private updateUrlParams(): void {
    const q = this.store.searchTerm().trim();
    const status = this.store.statusFilter();
    const sort = this.store.sortField();
    const dir = this.store.sortDirection();

    const queryParams: Record<string, string | null> = {
      q: q.length > 0 ? q : null,
      status: status !== 'all' ? status : null,
      sort: sort !== 'name' ? sort : null,
      dir: dir !== 'asc' ? dir : null
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  public formatDate(d: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  }

  public getAnomalyTooltip(org: CleanOrganisation): string {
    const labels = org.anomalies.map(a => {
      switch (a) {
        case 'DUPLICATE_ID': return `Duplicate ID #${org.originalId}`;
        case 'MISSING_NAME': return 'Missing / empty name in fixture';
        case 'NORMALIZED_STATUS_TYPO': return `Raw status typo "${org.rawStatus}" normalized`;
        case 'UNKNOWN_STATUS': return `Unknown raw status "${org.rawStatus}"`;
        case 'INVALID_EMAIL': return `Invalid owner email "${org.ownerEmail}"`;
        case 'UNPARSEABLE_DATE': return 'Unparseable raw createdAt date';
        case 'NEGATIVE_MEMBER_COUNT': return 'Negative raw member count clamped';
        case 'STRING_MEMBER_COUNT': return 'Raw member count parsed from string';
        case 'MISSING_OWNER': return 'Owner record missing in fixture';
        default: return a;
      }
    });
    return `Anomalies detected: ${labels.join(', ')}`;
  }

  public copyToClipboard(text: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  public onOrganisationCreated(name: string): void {
    this.successToast.set(name);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
