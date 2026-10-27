import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranslationService } from './translation.service';

describe('TranslationService (FR5 Compliance)', () => {
  let service: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TranslationService]
    });

    service = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should interpolate variables accurately into translation string', async () => {
    const loadPromise = service.loadTranslations('en');
    const req = httpMock.expectOne('/i18n/en.json');
    req.flush({
      app: {
        badge_records: '{count} organisations total'
      }
    });

    await loadPromise;

    const result = service.t('app.badge_records', { count: 137 });
    expect(result).toBe('137 organisations total');
  });

  it('should return key fallback if key path does not exist', () => {
    const result = service.t('non.existent.key');
    expect(result).toBe('non.existent.key');
  });
});
