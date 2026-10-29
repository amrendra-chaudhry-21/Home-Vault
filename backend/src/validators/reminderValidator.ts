import { z } from 'zod';
import { REMINDER_STATUS, REMINDER_TYPES } from '../config/constants';

export const createReminderSchema = z.object({
  params: z.object({
    applianceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appliance ID'),
  }),
  body: z.object({
    type: z.enum(Object.values(REMINDER_TYPES) as [string, ...string[]]),
    title: z.string().min(2, 'Title is required').trim(),
    notes: z.string().optional(),
    dueAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  }),
});

export const updateReminderStatusSchema = z.object({
  params: z.object({
    reminderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reminder ID'),
  }),
  body: z.object({
    status: z.enum([REMINDER_STATUS.COMPLETED, REMINDER_STATUS.DISMISSED, REMINDER_STATUS.PENDING]),
  }),
});
