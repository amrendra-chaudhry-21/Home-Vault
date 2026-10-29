import { z } from 'zod';

export const createServiceRecordSchema = z.object({
  params: z.object({
    applianceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appliance ID'),
  }),
  body: z.object({
    serviceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    issueDescription: z.string().min(2, 'Issue description is required').trim(),
    workPerformed: z.string().min(2, 'Work performed is required').trim(),
    cost: z.number().nonnegative().optional().nullable(),
    technicianName: z.string().optional(),
    providerName: z.string().optional(),
    notes: z.string().optional(),
    nextServiceDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  }),
});

export const updateServiceRecordSchema = z.object({
  params: z.object({
    serviceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid service ID'),
  }),
  body: z.object({
    serviceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    issueDescription: z.string().min(2).trim().optional(),
    workPerformed: z.string().min(2).trim().optional(),
    cost: z.number().nonnegative().optional().nullable(),
    technicianName: z.string().optional(),
    providerName: z.string().optional(),
    notes: z.string().optional(),
    nextServiceDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  }),
});
