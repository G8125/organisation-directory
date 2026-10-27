import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type TranslationDictionary = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly http = inject(HttpClient);

  // Signal holding the active translation dictionary
  public readonly currentLanguage = signal<string>('en');
  public readonly isLoaded = signal<boolean>(false);
  private readonly dictionary = signal<TranslationDictionary>({});

  public async loadTranslations(lang = 'en'): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<TranslationDictionary>(`/i18n/${lang}.json`)
      );
      this.dictionary.set(data);
      this.currentLanguage.set(lang);
      this.isLoaded.set(true);
    } catch (err) {
      console.warn(`[TranslationService] Could not load /i18n/${lang}.json asynchronously, keeping fallback.`, err);
      this.isLoaded.set(true);
    }
  }

  /**
   * Translate a key with optional dynamic parameters.
   * e.g. t('app.badge_records', { count: 137 })
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const dict = this.dictionary();
    const parts = key.split('.');
    let current: unknown = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return key; // Fallback to key if not found
      }
    }

    if (typeof current !== 'string') {
      return key;
    }

    if (!params) {
      return current;
    }

    return Object.entries(params).reduce((acc, [paramKey, paramVal]) => {
      const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
      return acc.replace(regex, String(paramVal));
    }, current);
  }
}
