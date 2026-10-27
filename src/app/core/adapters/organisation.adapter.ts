import {
  RawOrganisation,
  CleanOrganisation,
  OrganisationStatus,
  AnomalyType
} from '../models/organisation.model';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class OrganisationAdapter {
  /**
   * Transforms an array of raw messy API organisations into clean, validated domain models.
   * Tracks duplicate IDs to prevent UI key collisions and records anomalies for ops visibility.
   */
  public static transformAll(rawList: RawOrganisation[]): CleanOrganisation[] {
    const seenIds = new Set<number>();
    const duplicateIds = new Set<number>();

    // First pass: identify duplicate IDs
    for (const item of rawList) {
      const numId = Number(item.id);
      if (seenIds.has(numId)) {
        duplicateIds.add(numId);
      } else {
        seenIds.add(numId);
      }
    }

    // Second pass: sanitize individual records
    return rawList.map((raw, index) => this.transformOne(raw, index, duplicateIds.has(Number(raw.id))));
  }

  public static transformOne(raw: RawOrganisation, index: number, isDuplicate = false): CleanOrganisation {
    const anomalies: AnomalyType[] = [];
    const originalId = Number(raw.id) || 0;

    if (isDuplicate) {
      anomalies.push('DUPLICATE_ID');
    }

    // 1. Name Sanitization
    const rawName = raw.name;
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
    const isNameMissing = trimmedName.length === 0;

    if (isNameMissing) {
      anomalies.push('MISSING_NAME');
    }

    const name = trimmedName;
    const displayName = isNameMissing ? `Unnamed Organisation (ID: ${originalId})` : trimmedName;

    // 2. Status Sanitization & Normalization
    const rawStatus = raw.status ? String(raw.status).trim().toLowerCase() : '';
    let status: OrganisationStatus = 'unknown';

    if (rawStatus === 'actve') {
      status = 'active';
      anomalies.push('NORMALIZED_STATUS_TYPO');
    } else if (rawStatus === 'active') {
      status = 'active';
    } else if (rawStatus === 'inactive' || rawStatus === 'inactve') {
      status = 'inactive';
      if (rawStatus === 'inactve') anomalies.push('NORMALIZED_STATUS_TYPO');
    } else if (rawStatus === 'suspended' || rawStatus === 'suspnded') {
      status = 'suspended';
      if (rawStatus === 'suspnded') anomalies.push('NORMALIZED_STATUS_TYPO');
    } else {
      status = 'unknown';
      anomalies.push('UNKNOWN_STATUS');
    }

    // 3. Member Count Sanitization
    let memberCount = 0;
    let isMemberCountValid = true;

    if (raw.memberCount === null || raw.memberCount === undefined) {
      memberCount = 0;
      isMemberCountValid = false;
    } else if (typeof raw.memberCount === 'string') {
      anomalies.push('STRING_MEMBER_COUNT');
      const parsed = parseInt(raw.memberCount, 10);
      if (isNaN(parsed) || parsed < 0) {
        memberCount = 0;
        isMemberCountValid = false;
        anomalies.push('NEGATIVE_MEMBER_COUNT');
      } else {
        memberCount = parsed;
      }
    } else if (typeof raw.memberCount === 'number') {
      if (raw.memberCount < 0) {
        memberCount = 0;
        isMemberCountValid = false;
        anomalies.push('NEGATIVE_MEMBER_COUNT');
      } else {
        memberCount = raw.memberCount;
      }
    }

    // 4. Owner & Email Sanitization
    let ownerEmail: string | null = null;
    let isOwnerEmailValid = false;

    if (!raw.owner || !raw.owner.email) {
      anomalies.push('MISSING_OWNER');
    } else {
      const emailCandidate = String(raw.owner.email).trim();
      ownerEmail = emailCandidate;
      if (EMAIL_REGEX.test(emailCandidate)) {
        isOwnerEmailValid = true;
      } else {
        anomalies.push('INVALID_EMAIL');
      }
    }

    // 5. CreatedAt Date Sanitization
    let createdAt: Date | null = null;
    let createdAtIso: string | null = null;
    let isCreatedAtValid = false;

    if (raw.createdAt !== null && raw.createdAt !== undefined) {
      const parsedDate = new Date(raw.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate;
        createdAtIso = parsedDate.toISOString();
        isCreatedAtValid = true;
      } else {
        anomalies.push('UNPARSEABLE_DATE');
      }
    } else {
      anomalies.push('UNPARSEABLE_DATE');
    }

    return {
      uiKey: `org_${originalId}_${index}`,
      originalId,
      name,
      displayName,
      isNameMissing,
      status,
      rawStatus: raw.status ?? 'null',
      memberCount,
      isMemberCountValid,
      ownerEmail,
      isOwnerEmailValid,
      createdAt,
      createdAtIso,
      isCreatedAtValid,
      anomalies
    };
  }
}
