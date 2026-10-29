export const APPLIANCE_CATEGORIES = [
  'Air Conditioner',
  'Refrigerator',
  'Washing Machine',
  'Television',
  'RO Water Purifier',
  'Geyser / Water Heater',
  'Microwave Oven',
  'Air Purifier',
  'Chimney',
  'Inverter / UPS',
  'Vacuum Cleaner',
  'Dishwasher',
  'Other',
] as const;

export type ApplianceCategory = typeof APPLIANCE_CATEGORIES[number];

export const WARRANTY_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON', // Within 30 days
  EXPIRED: 'EXPIRED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type WarrantyStatus = typeof WARRANTY_STATUS[keyof typeof WARRANTY_STATUS];

export const HOUSEHOLD_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type HouseholdRole = typeof HOUSEHOLD_ROLES[keyof typeof HOUSEHOLD_ROLES];

export const REMINDER_TYPES = {
  WARRANTY_EXPIRY: 'warranty_expiry',
  SCHEDULED_MAINTENANCE: 'scheduled_maintenance',
  AMC_RENEWAL: 'amc_renewal',
  FILTER_CHANGE: 'filter_change',
} as const;

export type ReminderType = typeof REMINDER_TYPES[keyof typeof REMINDER_TYPES];

export const REMINDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
} as const;

export type ReminderStatus = typeof REMINDER_STATUS[keyof typeof REMINDER_STATUS];

export const DOCUMENT_TYPES = {
  INVOICE: 'invoice',
  WARRANTY_CARD: 'warranty_card',
  SERVICE_REPORT: 'service_report',
  MANUAL: 'manual',
  OTHER: 'other',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
