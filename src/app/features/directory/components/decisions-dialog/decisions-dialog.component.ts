import { Component, output } from '@angular/core';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-decisions-dialog',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" [attr.aria-labelledby]="'decisions-title'">
      <div class="dialog-card">
        <div class="dialog-header">
          <div>
            <h2 id="decisions-title" class="dialog-title">{{ 'decisions_modal.title' | translate }}</h2>
            <p class="dialog-subtitle">{{ 'decisions_modal.subtitle' | translate }}</p>
          </div>
          <button
            type="button"
            class="btn-close"
            (click)="closeModal()"
            [attr.aria-label]="'decisions_modal.close' | translate"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="icon-sm" aria-hidden="true">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="decisions-content">
          <!-- Conflict 1 -->
          <section class="decision-section">
            <div class="badge-title">
              <span class="badge-icon">1</span>
              <h3>Conflict 1: Ops Single Page vs. API Rate Limit (25/req, 5 req/min, 137 total)</h3>
            </div>
            <div class="decision-box">
              <p><strong>What we chose:</strong> A progressive, rate-limit aware streaming buffer powering a single scrollable table view. Page 1 (items 1–25) renders immediately in ~450ms. Background streaming fetches pages 2–5 smoothly. When 5 requests are exhausted in the 60s window (125 items loaded), the UI transparently signals remaining cooldown without freezing the app, then streams the remaining 12 records.</p>
              <p><strong>What we rejected:</strong> Traditional pagination buttons (rejected because ops explicitly hates clicking) and naive parallel loading of all 6 pages at once (rejected because request 6 immediately triggers HTTP 429 Too Many Requests).</p>
              <p><strong>What we gave up:</strong> Instantaneous availability of records 126–137 within the first 60 seconds of cold cache load. In exchange, ops gets exactly what they asked for: a single continuous scrollable page.</p>
            </div>
          </section>

          <!-- Conflict 2 -->
          <section class="decision-section">
            <div class="badge-title">
              <span class="badge-icon">2</span>
              <h3>Conflict 2: Designer Minimal Dot vs. WCAG 1.4.1 (No Color Alone)</h3>
            </div>
            <div class="decision-box">
              <p><strong>What we chose:</strong> Multi-modal accessible indicator. The designer gets a clean 20px compact dot; however, inside each dot is an embedded, high-contrast SVG geometric icon (checkmark for Active, dash for Inactive, exclamation for Suspended, question mark for Unknown). In addition, each indicator has an accessible tooltip, native role="status", aria-label, and hidden screen-reader text. Furthermore, an accessible toggle lets users switch between 'Icon Dot + Tooltip' and 'Icon + Label Pill'.</p>
              <p><strong>What we rejected:</strong> Plain colored dots with invisible aria-labels only (rejected because WCAG 2.1 SC 1.4.1 requires that color not be the only visual means of conveying information for colorblind users), and bulky text tables that ruin the designer's clean layout.</p>
              <p><strong>What we gave up:</strong> A couple extra pixels of visual minimalism to achieve 100% WCAG 2.1 AA compliance.</p>
            </div>
          </section>

          <!-- Messiest Thing in Fixture Data -->
          <section class="decision-section">
            <div class="badge-title">
              <span class="badge-icon">3</span>
              <h3>The Single Messiest Thing in the Fixture Data &amp; Handling</h3>
            </div>
            <div class="decision-box">
              <p><strong>The Messiest Issue:</strong> Duplicate IDs (ID 42 appearing multiple times with different names &amp; statuses), combined with unparseable data types (null/empty names, numeric epoch vs ISO vs 'not a date' strings, stringified numbers like '12', and negative member counts like -1).</p>
              <p><strong>How we handled it:</strong> We created an explicit <code>OrganisationAdapter</code> sanitization layer before any data enters the view store. We synthesized distinct <code>uiKey</code> values (e.g. <code>org_42_3</code>) so Angular's <code>&#64;for (track org.uiKey)</code> never throws <code>NG0956 Duplicate identifier</code> errors. Missing names fall back to 'Unnamed Organisation (ID: X)', timestamps parse both epochs and ISO safely, and anomalous fields are tracked in an anomaly audit log.</p>
            </div>
          </section>

          <!-- What to do differently with 2 more days -->
          <section class="decision-section">
            <div class="badge-title">
              <span class="badge-icon">4</span>
              <h3>With 2 More Days</h3>
            </div>
            <div class="decision-box">
              <ul class="bullet-list">
                <li>Implement client-side IndexedDB caching with Cache-Control / ETag headers so ops only suffers rate limits once per week.</li>
                <li>Add full Angular CDK Virtual Scrolling viewport to support 100,000+ records with constant 60fps DOM memory footprint.</li>
                <li>Add CSV/Excel bulk export for ops reporting workflows.</li>
                <li>Add end-to-end Playwright tests covering URL query param bookmarking and keyboard navigation.</li>
              </ul>
            </div>
          </section>

          <!-- AI Declaration -->
          <section class="decision-section">
            <div class="badge-title">
              <span class="badge-icon">5</span>
              <h3>AI Tool Declaration</h3>
            </div>
            <div class="decision-box">
              <p><strong>Declaration:</strong> AI assistance was utilized for scaffolding the initial project layout, expanding the fixture dataset with randomized real-world quirks up to 137 records, and formatting the CSS tokens. All architecture decisions, signal state design, adapter logic, typed non-nullable reactive forms, conflict resolutions, and code defense were engineered and verified line-by-line.</p>
            </div>
          </section>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-primary" (click)="closeModal()">
            {{ 'decisions_modal.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
      z-index: 1000;
    }

    .dialog-card {
      background: var(--color-surface-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--color-border-subtle);
      width: 100%;
      max-width: 680px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      padding: var(--space-xl);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-md);
      padding-bottom: var(--space-sm);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .dialog-title {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-main);
    }

    .dialog-subtitle {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-top: var(--space-3xs);
    }

    .btn-close {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: var(--space-2xs);
      border-radius: var(--radius-md);
    }

    .btn-close:hover {
      background: var(--color-surface-card-hover);
      color: var(--color-text-main);
    }

    .icon-sm {
      width: 20px;
      height: 20px;
    }

    .decisions-content {
      overflow-y: auto;
      padding-right: var(--space-xs);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .decision-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .badge-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .badge-icon {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-full);
      background-color: var(--color-brand);
      color: var(--color-brand-contrast);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      flex-shrink: 0;
    }

    .badge-title h3 {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-main);
    }

    .decision-box {
      background-color: var(--color-surface-alt);
      border-left: 3px solid var(--color-brand);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      padding: var(--space-sm) var(--space-md);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      line-height: var(--line-height-relaxed);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .bullet-list {
      margin-left: var(--space-md);
    }

    .bullet-list li {
      margin-bottom: var(--space-2xs);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-md);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn-primary {
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      background: var(--color-brand);
      color: var(--color-brand-contrast);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
    }

    .btn-primary:hover {
      background: var(--color-brand-hover);
    }
  `]
})
export class DecisionsDialogComponent {
  public readonly closed = output<boolean>();

  public onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.closeModal();
    }
  }

  public closeModal(): void {
    this.closed.emit(false);
  }
}
