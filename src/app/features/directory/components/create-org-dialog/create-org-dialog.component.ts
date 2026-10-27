import { Component, inject, output, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn
} from '@angular/forms';
import { OrganisationStoreService } from '../../../../core/services/organisation-store.service';
import { OrganisationApiService } from '../../../../core/services/organisation-api.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-create-org-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" [attr.aria-labelledby]="'dialog-title'">
      <div class="dialog-card">
        <!-- Header -->
        <div class="dialog-header">
          <div>
            <h2 id="dialog-title" class="dialog-title">{{ 'form.modal_title' | translate }}</h2>
            <p class="dialog-subtitle">{{ 'form.modal_desc' | translate }}</p>
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

        <!-- Accessible Form-Level Error Summary Banner (FR3 requirement) -->
        @if (showErrorSummary() && formErrorList().length > 0) {
          <div class="error-summary-banner" role="alert" aria-live="assertive">
            <div class="error-summary-header">
              <svg viewBox="0 0 20 20" fill="currentColor" class="icon-alert" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span class="error-summary-title">{{ 'form.error_summary_title' | translate }}</span>
            </div>
            <ul class="error-summary-list">
              @for (err of formErrorList(); track err) {
                <li>{{ err }}</li>
              }
            </ul>
          </div>
        }

        <!-- Typed Non-Nullable Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="form-body">
          <!-- 1. Organisation Name -->
          <div class="form-group" [class.has-error]="nameControl.touched && nameControl.invalid">
            <label for="org-name" class="form-label">
              {{ 'form.field_name' | translate }} <span class="required-star">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              class="form-input"
              formControlName="name"
              [placeholder]="'form.field_name_placeholder' | translate"
              [attr.aria-invalid]="nameControl.touched && nameControl.invalid"
              aria-describedby="org-name-hint org-name-error"
            />
            <p id="org-name-hint" class="field-hint">{{ 'form.field_name_hint' | translate }}</p>

            @if (nameControl.touched && nameControl.invalid) {
              <div id="org-name-error" class="field-error" role="alert">
                @if (nameControl.errors?.['required']) {
                  <span>{{ 'form.errors.name_required' | translate }}</span>
                } @else if (nameControl.errors?.['minlength']) {
                  <span>{{ 'form.errors.name_minlength' | translate }}</span>
                } @else if (nameControl.errors?.['maxlength']) {
                  <span>{{ 'form.errors.name_maxlength' | translate }}</span>
                } @else if (nameControl.errors?.['nameTaken']) {
                  <span>{{ 'form.errors.name_unique' | translate }}</span>
                }
              </div>
            }
          </div>

          <!-- 2. Status Select -->
          <div class="form-group" [class.has-error]="statusControl.touched && statusControl.invalid">
            <label for="org-status" class="form-label">
              {{ 'form.field_status' | translate }} <span class="required-star">*</span>
            </label>
            <select
              id="org-status"
              class="form-select"
              formControlName="status"
              [attr.aria-invalid]="statusControl.touched && statusControl.invalid"
              aria-describedby="org-status-error"
            >
              <option value="active">{{ 'status.active' | translate }}</option>
              <option value="inactive">{{ 'status.inactive' | translate }}</option>
              <option value="suspended">{{ 'status.suspended' | translate }}</option>
            </select>

            @if (statusControl.touched && statusControl.invalid) {
              <div id="org-status-error" class="field-error" role="alert">
                <span>{{ 'form.errors.status_required' | translate }}</span>
              </div>
            }
          </div>

          <!-- 3. Owner Email -->
          <div class="form-group" [class.has-error]="ownerControl.touched && ownerControl.invalid">
            <label for="org-owner" class="form-label">
              {{ 'form.field_owner' | translate }} <span class="required-star">*</span>
            </label>
            <input
              id="org-owner"
              type="email"
              class="form-input"
              formControlName="ownerEmail"
              [placeholder]="'form.field_owner_placeholder' | translate"
              [attr.aria-invalid]="ownerControl.touched && ownerControl.invalid"
              aria-describedby="org-owner-hint org-owner-error"
            />
            <p id="org-owner-hint" class="field-hint">{{ 'form.field_owner_hint' | translate }}</p>

            @if (ownerControl.touched && ownerControl.invalid) {
              <div id="org-owner-error" class="field-error" role="alert">
                @if (ownerControl.errors?.['required']) {
                  <span>{{ 'form.errors.owner_required' | translate }}</span>
                } @else if (ownerControl.errors?.['email']) {
                  <span>{{ 'form.errors.owner_invalid' | translate }}</span>
                }
              </div>
            }
          </div>

          <!-- 4. Member Count (Optional, >= 0) -->
          <div class="form-group" [class.has-error]="memberCountControl.touched && memberCountControl.invalid">
            <label for="org-members" class="form-label">
              {{ 'form.field_members' | translate }}
            </label>
            <input
              id="org-members"
              type="number"
              min="0"
              class="form-input"
              formControlName="memberCount"
              [placeholder]="'form.field_members_placeholder' | translate"
              [attr.aria-invalid]="memberCountControl.touched && memberCountControl.invalid"
              aria-describedby="org-members-hint org-members-error"
            />
            <p id="org-members-hint" class="field-hint">{{ 'form.field_members_hint' | translate }}</p>

            @if (memberCountControl.touched && memberCountControl.invalid) {
              <div id="org-members-error" class="field-error" role="alert">
                <span>{{ 'form.errors.members_min' | translate }}</span>
              </div>
            }
          </div>

          <!-- API error notice if create failed -->
          @if (apiSubmissionError()) {
            <div class="api-error-alert" role="alert">
              {{ apiSubmissionError() }}
            </div>
          }

          <!-- Modal Actions -->
          <div class="dialog-actions">
            <button
              type="button"
              class="btn-secondary"
              (click)="closeModal()"
              [disabled]="isSubmitting()"
            >
              {{ 'form.btn_cancel' | translate }}
            </button>
            <button
              type="submit"
              class="btn-primary"
              [disabled]="isSubmitting()"
            >
              @if (isSubmitting()) {
                <span class="spinner-sm" aria-hidden="true"></span>
                <span>{{ 'form.btn_submitting' | translate }}</span>
              } @else {
                <span>{{ 'form.btn_submit' | translate }}</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.5);
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
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      padding: var(--space-xl);
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-lg);
    }

    .dialog-title {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-main);
    }

    .dialog-subtitle {
      font-size: var(--font-size-sm);
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
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-close:hover {
      background: var(--color-surface-card-hover);
      color: var(--color-text-main);
    }

    .icon-sm {
      width: 20px;
      height: 20px;
    }

    /* Error Summary Banner (FR3 compliant) */
    .error-summary-banner {
      background-color: var(--color-danger-bg);
      border: 1px solid var(--color-danger-border);
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .error-summary-header {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-danger-text);
      font-size: var(--font-size-sm);
    }

    .icon-alert {
      width: 18px;
      height: 18px;
      color: var(--color-danger);
      flex-shrink: 0;
    }

    .error-summary-list {
      margin-top: var(--space-xs);
      margin-left: var(--space-lg);
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
    }

    .error-summary-list li {
      margin-bottom: var(--space-3xs);
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
    }

    .form-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }

    .required-star {
      color: var(--color-danger);
    }

    .form-input, .form-select {
      width: 100%;
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--font-size-sm);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-strong);
      background-color: var(--color-surface-card);
      color: var(--color-text-main);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      font-family: inherit;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--color-brand);
      box-shadow: var(--shadow-focus);
    }

    .has-error .form-input, .has-error .form-select {
      border-color: var(--color-danger);
    }

    .has-error .form-input:focus, .has-error .form-select:focus {
      box-shadow: var(--shadow-focus-danger);
    }

    .field-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-faint);
    }

    .field-error {
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
      font-weight: var(--font-weight-medium);
      margin-top: var(--space-3xs);
    }

    .api-error-alert {
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-md);
      background: var(--color-danger-bg);
      border: 1px solid var(--color-danger-border);
      color: var(--color-danger-text);
      font-size: var(--font-size-xs);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
      margin-top: var(--space-md);
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn-secondary {
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface-card);
      color: var(--color-text-main);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--color-surface-card-hover);
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
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      box-shadow: var(--shadow-xs);
      transition: background 0.15s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-brand-hover);
    }

    .btn-primary:disabled, .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CreateOrgDialogComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly store = inject(OrganisationStoreService);
  private readonly api = inject(OrganisationApiService);
  private readonly translationService = inject(TranslationService);

  public readonly closed = output<boolean>();
  public readonly created = output<string>();

  public readonly isSubmitting = signal<boolean>(false);
  public readonly showErrorSummary = signal<boolean>(false);
  public readonly apiSubmissionError = signal<string | null>(null);

  /**
   * Typed Non-Nullable Form with updateOn: 'blur' for field-level error display on blur
   */
  public readonly form = this.fb.group({
    name: [
      '',
      {
        validators: [Validators.required, Validators.minLength(3), Validators.maxLength(80)],
        asyncValidators: [this.uniqueNameAsyncValidator()],
        updateOn: 'blur'
      }
    ],
    status: [
      'active',
      {
        validators: [Validators.required],
        updateOn: 'blur'
      }
    ],
    ownerEmail: [
      '',
      {
        validators: [Validators.required, Validators.email],
        updateOn: 'blur'
      }
    ],
    memberCount: [
      0,
      {
        validators: [Validators.min(0)],
        updateOn: 'blur'
      }
    ]
  });

  public get nameControl() { return this.form.controls.name; }
  public get statusControl() { return this.form.controls.status; }
  public get ownerControl() { return this.form.controls.ownerEmail; }
  public get memberCountControl() { return this.form.controls.memberCount; }

  /**
   * Computes human-readable list of all current errors for the accessible banner
   */
  public formErrorList(): string[] {
    const errors: string[] = [];
    if (this.nameControl.invalid) {
      if (this.nameControl.errors?.['required']) errors.push(this.translationService.t('form.errors.name_required'));
      else if (this.nameControl.errors?.['minlength']) errors.push(this.translationService.t('form.errors.name_minlength'));
      else if (this.nameControl.errors?.['maxlength']) errors.push(this.translationService.t('form.errors.name_maxlength'));
      else if (this.nameControl.errors?.['nameTaken']) errors.push(this.translationService.t('form.errors.name_unique'));
    }
    if (this.statusControl.invalid) {
      errors.push(this.translationService.t('form.errors.status_required'));
    }
    if (this.ownerControl.invalid) {
      if (this.ownerControl.errors?.['required']) errors.push(this.translationService.t('form.errors.owner_required'));
      else if (this.ownerControl.errors?.['email']) errors.push(this.translationService.t('form.errors.owner_invalid'));
    }
    if (this.memberCountControl.invalid) {
      errors.push(this.translationService.t('form.errors.members_min'));
    }
    return errors;
  }

  /**
   * Async Validator: Checks if organisation name is already taken case-insensitively
   */
  private uniqueNameAsyncValidator(): AsyncValidatorFn {
    return async (control: AbstractControl): Promise<ValidationErrors | null> => {
      const val = control.value;
      if (!val || typeof val !== 'string' || val.trim().length < 3) return null;
      const taken = await this.api.isNameTaken(val);
      return taken ? { nameTaken: true } : null;
    };
  }

  public onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.closeModal();
    }
  }

  public closeModal(): void {
    this.closed.emit(false);
  }

  public async onSubmit(): Promise<void> {
    this.apiSubmissionError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showErrorSummary.set(true);
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formVal = this.form.getRawValue();
      await this.store.createOrganisation({
        name: formVal.name,
        status: formVal.status,
        ownerEmail: formVal.ownerEmail,
        memberCount: formVal.memberCount
      });

      this.created.emit(formVal.name);
      this.closeModal();
    } catch (err: unknown) {
      this.apiSubmissionError.set(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
