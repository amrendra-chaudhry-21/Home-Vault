import { z } from 'zod';
import { HOUSEHOLD_ROLES } from '../config/constants';

export const createHouseholdSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Household name must be at least 2 characters').trim(),
    address: z.string().optional(),
    timezone: z.string().default('Asia/Kolkata'),
  }),
});

export const updateHouseholdSchema = z.object({
  params: z.object({
    householdId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid household ID'),
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    address: z.string().optional(),
    timezone: z.string().optional(),
  }),
});

export const inviteMemberSchema = z.object({
  params: z.object({
    householdId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid household ID'),
  }),
  body: z.object({
    email: z.string().email('Please provide a valid email').trim().toLowerCase(),
    role: z.enum([HOUSEHOLD_ROLES.ADMIN, HOUSEHOLD_ROLES.MEMBER]).default(HOUSEHOLD_ROLES.MEMBER),
  }),
});
