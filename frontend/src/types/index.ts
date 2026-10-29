export type ApplianceCategory =
  | 'Air Conditioner'
  | 'Refrigerator'
  | 'Washing Machine'
  | 'Television'
  | 'RO Water Purifier'
  | 'Geyser / Water Heater'
  | 'Microwave Oven'
  | 'Air Purifier'
  | 'Chimney'
  | 'Inverter / UPS'
  | 'Vacuum Cleaner'
  | 'Dishwasher'
  | 'Other';

export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    warrantyAlerts: boolean;
    serviceReminders: boolean;
  };
}

export interface Household {
  id: string;
  name: string;
  address?: string;
  timezone: string;
  role: 'owner' | 'admin' | 'member';
  isOwner: boolean;
  createdAt: string;
}

export interface Appliance {
  id: string;
  householdId: string;
  name: string;
  category: ApplianceCategory;
  brand: string;
  modelNumber: string;
  serialNumber?: string;
  purchaseDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  purchasePrice?: number | null;
  seller?: string;
  notes?: string;
  warrantyStatus: WarrantyStatus;
  warrantyDaysRemaining?: number | null;
  qrTokenId?: string | null;
  createdAt: string;
}

export interface ServiceRecord {
  id: string;
  applianceId: string;
  householdId: string;
  applianceName?: string;
  serviceDate: string;
  issueDescription: string;
  workPerformed: string;
  cost?: number | null;
  technicianName?: string;
  providerName?: string;
  notes?: string;
  nextServiceDate?: string | null;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  householdId: string;
  applianceId?: string | null;
  applianceName: string;
  applianceCategory?: string;
  type: 'warranty_expiry' | 'scheduled_maintenance' | 'amc_renewal' | 'filter_change';
  title: string;
  notes?: string;
  dueAt: string;
  status: 'pending' | 'completed' | 'dismissed';
  completedAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  documentType: 'invoice' | 'warranty_card' | 'service_report' | 'manual' | 'other';
  createdAt: string;
}

export interface DashboardData {
  stats: {
    totalAppliances: number;
    expiringSoonCount: number;
    upcomingRemindersCount: number;
  };
  expiringSoon: Array<{
    id: string;
    name: string;
    brand: string;
    category: ApplianceCategory;
    warrantyEndDate: string;
    daysRemaining: number;
  }>;
  upcomingReminders: Array<{
    id: string;
    applianceName: string;
    title: string;
    type: string;
    dueAt: string;
  }>;
  recentServices: Array<{
    id: string;
    applianceName: string;
    serviceDate: string;
    workPerformed: string;
    cost?: number | null;
    technicianName?: string;
    nextServiceDate?: string | null;
  }>;
}
