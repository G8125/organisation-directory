import { OrganisationAdapter } from './organisation.adapter';
import { RawOrganisation } from '../models/organisation.model';

describe('OrganisationAdapter (Data Quirks & Resilience)', () => {
  it('should generate unique uiKeys for duplicate IDs without crashing', () => {
    const raw: RawOrganisation[] = [
      { id: 42, name: 'Globex Corporation', status: 'suspended', memberCount: 7 },
      { id: 42, name: 'Globex Corporation Ltd', status: 'actve', memberCount: 7 }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned.length).toBe(2);
    expect(cleaned[0].uiKey).not.toBe(cleaned[1].uiKey);
    expect(cleaned[0].anomalies).toContain('DUPLICATE_ID');
    expect(cleaned[1].anomalies).toContain('DUPLICATE_ID');
  });

  it('should provide fallback display name for null or whitespace names', () => {
    const raw: RawOrganisation[] = [
      { id: 2, name: '', status: 'ACTIVE' },
      { id: 3, name: null, status: 'Active' },
      { id: 4, name: '   ', status: 'inactive' }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].isNameMissing).toBeTrue();
    expect(cleaned[0].displayName).toBe('Unnamed Organisation (ID: 2)');
    expect(cleaned[1].isNameMissing).toBeTrue();
    expect(cleaned[1].displayName).toBe('Unnamed Organisation (ID: 3)');
    expect(cleaned[2].isNameMissing).toBeTrue();
  });

  it('should normalize status casing and fix known typos like "actve"', () => {
    const raw: RawOrganisation[] = [
      { id: 1, name: 'A', status: 'ACTIVE' },
      { id: 2, name: 'B', status: 'actve' },
      { id: 3, name: 'C', status: 'inactve' },
      { id: 4, name: 'D', status: 'suspnded' },
      { id: 5, name: 'E', status: null }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].status).toBe('active');
    expect(cleaned[1].status).toBe('active');
    expect(cleaned[1].anomalies).toContain('NORMALIZED_STATUS_TYPO');
    expect(cleaned[2].status).toBe('inactive');
    expect(cleaned[3].status).toBe('suspended');
    expect(cleaned[4].status).toBe('unknown');
    expect(cleaned[4].anomalies).toContain('UNKNOWN_STATUS');
  });

  it('should parse string member counts and handle negative values safely', () => {
    const raw: RawOrganisation[] = [
      { id: 1, name: 'A', memberCount: '12' },
      { id: 2, name: 'B', memberCount: -1 },
      { id: 3, name: 'C', memberCount: null }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].memberCount).toBe(12);
    expect(cleaned[0].anomalies).toContain('STRING_MEMBER_COUNT');
    expect(cleaned[1].memberCount).toBe(0);
    expect(cleaned[1].anomalies).toContain('NEGATIVE_MEMBER_COUNT');
    expect(cleaned[2].memberCount).toBe(0);
    expect(cleaned[2].isMemberCountValid).toBeFalse();
  });

  it('should parse epoch timestamps and ISO strings while catching unparseable dates', () => {
    const raw: RawOrganisation[] = [
      { id: 1, name: 'A', createdAt: '2024-03-11T09:12:00Z' },
      { id: 2, name: 'B', createdAt: 1710150720000 },
      { id: 3, name: 'C', createdAt: 'not a date' }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].isCreatedAtValid).toBeTrue();
    expect(cleaned[0].createdAt).toBeInstanceOf(Date);
    expect(cleaned[1].isCreatedAtValid).toBeTrue();
    expect(cleaned[1].createdAt?.getTime()).toBe(1710150720000);
    expect(cleaned[2].isCreatedAtValid).toBeFalse();
    expect(cleaned[2].createdAt).toBeNull();
    expect(cleaned[2].anomalies).toContain('UNPARSEABLE_DATE');
  });

  it('should flag invalid owner email addresses and missing owners', () => {
    const raw: RawOrganisation[] = [
      { id: 1, name: 'A', owner: { email: 'valid@example.com' } },
      { id: 2, name: 'B', owner: { email: 'not-an-email' } },
      { id: 3, name: 'C', owner: null }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].isOwnerEmailValid).toBeTrue();
    expect(cleaned[1].isOwnerEmailValid).toBeFalse();
    expect(cleaned[1].anomalies).toContain('INVALID_EMAIL');
    expect(cleaned[2].isOwnerEmailValid).toBeFalse();
    expect(cleaned[2].anomalies).toContain('MISSING_OWNER');
  });

  it('should preserve Arabic Unicode text and emojis accurately', () => {
    const raw: RawOrganisation[] = [
      { id: 6, name: 'شركة الأمل 🚀', status: 'active' }
    ];

    const cleaned = OrganisationAdapter.transformAll(raw);
    expect(cleaned[0].name).toBe('شركة الأمل 🚀');
    expect(cleaned[0].displayName).toBe('شركة الأمل 🚀');
  });
});
