import { WARRANTY_STATUS, WarrantyStatus } from '../config/constants';

/**
 * Calculates current warranty status relative to warrantyEndDate
 */
export function calculateWarrantyStatus(warrantyEndDate?: Date | string | null): {
  status: WarrantyStatus;
  daysRemaining: number | null;
} {
  if (!warrantyEndDate) {
    return { status: WARRANTY_STATUS.UNKNOWN, daysRemaining: null };
  }

  const end = new Date(warrantyEndDate);
  if (isNaN(end.getTime())) {
    return { status: WARRANTY_STATUS.UNKNOWN, daysRemaining: null };
  }

  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: WARRANTY_STATUS.EXPIRED, daysRemaining };
  }

  if (daysRemaining <= 30) {
    return { status: WARRANTY_STATUS.EXPIRING_SOON, daysRemaining };
  }

  return { status: WARRANTY_STATUS.ACTIVE, daysRemaining };
}

/**
 * Format date in Indian standard format (DD MMM YYYY)
 */
export function formatIndianDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
