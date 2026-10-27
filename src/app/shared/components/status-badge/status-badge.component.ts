import { Component, input, inject } from '@angular/core';
import { OrganisationStatus } from '../../../core/models/organisation.model';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div
      class="status-container"
      [class.mode-dot]="mode() === 'accessible-dot'"
      [class.mode-pill]="mode() === 'full-pill'"
      [attr.data-status]="status()"
      [title]="statusLabel()"
      tabindex="0"
      role="status"
      [attr.aria-label]="statusLabel()"
    >
      <!-- Multi-modal icon: visual geometric shape distinguishes status even in monochrome -->
      <span class="status-indicator">
        @switch (status()) {
          @case ('active') {
            <!-- Checkmark icon inside circle for Active -->
            <svg class="status-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M12.2 4.8L6.5 10.5L3.8 7.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          }
          @case ('inactive') {
            <!-- Dash/Pause icon inside square/ring for Inactive -->
            <svg class="status-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.5 8H11.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          }
          @case ('suspended') {
            <!-- Exclamation icon inside triangle/circle for Suspended -->
            <svg class="status-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 4.5V8.5M8 11.5H8.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          }
          @default {
            <!-- Question mark for Unknown/Anomalous -->
            <svg class="status-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6.5 6C6.5 5 7 4 8 4C9 4 9.5 5 9.5 5.8C9.5 7 8 7.5 8 9M8 11.5H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          }
        }
      </span>

      <!-- Text label: either visible in full-pill mode or screen-reader only in accessible-dot mode -->
      @if (mode() === 'full-pill') {
        <span class="status-text">{{ statusLabel() }}</span>
      } @else {
        <span class="sr-only">{{ statusLabel() }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
    }

    .status-container {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      border-radius: var(--radius-full);
      transition: all 0.2s ease;
      position: relative;
    }

    .status-container:focus-visible {
      outline: 2px solid var(--color-brand);
      outline-offset: 2px;
    }

    /* Mode: Accessible Dot (Minimalist dot for designer, multi-modal for WCAG 1.4.1) */
    .mode-dot {
      padding: var(--space-3xs);
    }

    .mode-dot .status-indicator {
      width: 20px;
      height: 20px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-xs);
      border: 1.5px solid transparent;
    }

    .mode-dot .status-icon {
      width: 12px;
      height: 12px;
    }

    /* Mode: Full Pill */
    .mode-pill {
      padding: var(--space-3xs) var(--space-sm);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      border: 1px solid transparent;
    }

    .mode-pill .status-indicator {
      width: 14px;
      height: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .mode-pill .status-icon {
      width: 12px;
      height: 12px;
    }

    /* Status Color & Shape Tokens */
    [data-status="active"] {
      background-color: var(--status-active-bg);
      color: var(--status-active-text);
      border-color: var(--status-active-border);
    }
    .mode-dot[data-status="active"] .status-indicator {
      background-color: var(--status-active-dot);
      color: #ffffff;
      border-color: var(--status-active-border);
    }

    [data-status="inactive"] {
      background-color: var(--status-inactive-bg);
      color: var(--status-inactive-text);
      border-color: var(--status-inactive-border);
    }
    .mode-dot[data-status="inactive"] .status-indicator {
      background-color: var(--status-inactive-dot);
      color: #ffffff;
      border-color: var(--status-inactive-border);
    }

    [data-status="suspended"] {
      background-color: var(--status-suspended-bg);
      color: var(--status-suspended-text);
      border-color: var(--status-suspended-border);
    }
    .mode-dot[data-status="suspended"] .status-indicator {
      background-color: var(--status-suspended-dot);
      color: #ffffff;
      border-color: var(--status-suspended-border);
    }

    [data-status="unknown"] {
      background-color: var(--status-unknown-bg);
      color: var(--status-unknown-text);
      border-color: var(--status-unknown-border);
    }
    .mode-dot[data-status="unknown"] .status-indicator {
      background-color: var(--status-unknown-dot);
      color: #ffffff;
      border-color: var(--status-unknown-border);
    }
  `]
})
export class StatusBadgeComponent {
  private readonly translationService = inject(TranslationService);

  public readonly status = input.required<OrganisationStatus>();
  public readonly mode = input<'accessible-dot' | 'full-pill'>('accessible-dot');

  public statusLabel(): string {
    const s = this.status();
    return this.translationService.t(`status.${s}`);
  }
}
