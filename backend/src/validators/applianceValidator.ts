import { z } from 'zod';
import { APPLIANCE_CATEGORIES } from '../config/constants';

export const createApplianceSchema = z.object({
  params: z.object({
    householdId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid household ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    category: z.enum(APPLIANCE_CATEGORIES),
    brand: z.string().min(1, 'Brand is required').trim(),
    modelNumber: z.string().min(1, 'Model number is required').trim(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    warrantyStartDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    warrantyEndDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    purchasePrice: z.number().nonnegative('Purchase price must be positive').optional().nullable(),
    seller: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateApplianceSchema = z.object({
  params: z.object({
    applianceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appliance ID'),
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    category: z.enum(APPLIANCE_CATEGORIES).optional(),
    brand: z.string().min(1).trim().optional(),
    modelNumber: z.string().min(1).trim().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
    warrantyStartDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
    warrantyEndDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
    purchasePrice: z.number().nonnegative().optional().nullable(),
    seller: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const listAppliancesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    category: z.string().optional(),
    warrantyStatus: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED']).optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'warranty_asc', 'name']).default('newest'),
  }),
});
