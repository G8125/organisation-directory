export type OrganisationStatus = 'active' | 'inactive' | 'suspended' | 'unknown';

export interface RawOwner {
  email?: string | null;
}

export interface RawOrganisation {
  id: number | string;
  name?: string | null;
  status?: string | null;
  memberCount?: number | string | null;
  owner?: RawOwner | null;
  createdAt?: string | number | null;
}

export type AnomalyType =
  | 'DUPLICATE_ID'
  | 'MISSING_NAME'
  | 'UNPARSEABLE_DATE'
  | 'INVALID_EMAIL'
  | 'NEGATIVE_MEMBER_COUNT'
  | 'STRING_MEMBER_COUNT'
  | 'NORMALIZED_STATUS_TYPO'
  | 'UNKNOWN_STATUS'
  | 'MISSING_OWNER';

export interface CleanOrganisation {
  /** Unique key guaranteed to be distinct for UI @for tracking */
  readonly uiKey: string;
  readonly originalId: number;
  readonly name: string;
  readonly displayName: string;
  readonly isNameMissing: boolean;
  readonly status: OrganisationStatus;
  readonly rawStatus: string;
  readonly memberCount: number;
  readonly isMemberCountValid: boolean;
  readonly ownerEmail: string | null;
  readonly isOwnerEmailValid: boolean;
  readonly createdAt: Date | null;
  readonly createdAtIso: string | null;
  readonly isCreatedAtValid: boolean;
  readonly anomalies: AnomalyType[];
}

export type SortField = 'name' | 'createdAt' | 'memberCount';
export type SortDirection = 'asc' | 'desc';

export interface DirectoryFilters {
  searchTerm: string;
  status: OrganisationStatus | 'all';
  sortBy: SortField;
  sortDirection: SortDirection;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
