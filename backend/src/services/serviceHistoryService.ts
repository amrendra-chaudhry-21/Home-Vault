import { Types } from 'mongoose';
import { ServiceRecord, IServiceRecord } from '../models/ServiceRecord';
import { Appliance } from '../models/Appliance';
import { Reminder } from '../models/Reminder';
import { REMINDER_TYPES, REMINDER_STATUS } from '../config/constants';
import { AppError } from '../utils/appError';

export class ServiceHistoryService {
  static async createServiceRecord(
    applianceId: string,
    userId: string,
    data: {
      serviceDate: string | Date;
      issueDescription: string;
      workPerformed: string;
      cost?: number | null;
      technicianName?: string;
      providerName?: string;
      notes?: string;
      nextServiceDate?: string | Date | null;
    }
  ): Promise<IServiceRecord> {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    const service = await ServiceRecord.create({
      applianceId: appliance._id,
      householdId: appliance.householdId,
      serviceDate: new Date(data.serviceDate),
      issueDescription: data.issueDescription,
      workPerformed: data.workPerformed,
      cost: data.cost || null,
      technicianName: data.technicianName || '',
      providerName: data.providerName || '',
      notes: data.notes || '',
      nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
      createdBy: new Types.ObjectId(userId),
    });

    // Auto-create next maintenance reminder if nextServiceDate provided and is in the future
    if (service.nextServiceDate && service.nextServiceDate > new Date()) {
      await Reminder.create({
        householdId: appliance.householdId,
        applianceId: appliance._id,
        type: REMINDER_TYPES.SCHEDULED_MAINTENANCE,
        title: `Scheduled Service for ${appliance.brand} ${appliance.name}`,
        notes: `Follow-up service. Issue previously repaired: ${data.issueDescription}`,
        dueAt: service.nextServiceDate,
        status: REMINDER_STATUS.PENDING,
        createdBy: new Types.ObjectId(userId),
      });
    }

    return service;
  }

  static async getApplianceServices(applianceId: string) {
    const services = await ServiceRecord.find({
      applianceId: new Types.ObjectId(applianceId),
    }).sort({ serviceDate: -1 });

    return services.map((s) => ({
      id: s._id.toString(),
      applianceId: s.applianceId.toString(),
      householdId: s.householdId.toString(),
      serviceDate: s.serviceDate,
      issueDescription: s.issueDescription,
      workPerformed: s.workPerformed,
      cost: s.cost,
      technicianName: s.technicianName,
      providerName: s.providerName,
      notes: s.notes,
      nextServiceDate: s.nextServiceDate,
      createdAt: s.createdAt,
    }));
  }

  static async getServiceById(serviceId: string) {
    const service = await ServiceRecord.findById(serviceId);
    if (!service) {
      throw AppError.notFound('Service record not found');
    }
    return {
      id: service._id.toString(),
      applianceId: service.applianceId.toString(),
      householdId: service.householdId.toString(),
      serviceDate: service.serviceDate,
      issueDescription: service.issueDescription,
      workPerformed: service.workPerformed,
      cost: service.cost,
      technicianName: service.technicianName,
      providerName: service.providerName,
      notes: service.notes,
      nextServiceDate: service.nextServiceDate,
      createdAt: service.createdAt,
    };
  }

  static async updateServiceRecord(
    serviceId: string,
    data: Partial<{
      serviceDate: string | Date;
      issueDescription: string;
      workPerformed: string;
      cost: number | null;
      technicianName: string;
      providerName: string;
      notes: string;
      nextServiceDate: string | Date | null;
    }>
  ) {
    const service = await ServiceRecord.findById(serviceId);
    if (!service) {
      throw AppError.notFound('Service record not found');
    }

    if (data.serviceDate !== undefined) service.serviceDate = new Date(data.serviceDate);
    if (data.issueDescription !== undefined) service.issueDescription = data.issueDescription;
    if (data.workPerformed !== undefined) service.workPerformed = data.workPerformed;
    if (data.cost !== undefined) service.cost = data.cost;
    if (data.technicianName !== undefined) service.technicianName = data.technicianName;
    if (data.providerName !== undefined) service.providerName = data.providerName;
    if (data.notes !== undefined) service.notes = data.notes;
    if (data.nextServiceDate !== undefined) {
      service.nextServiceDate = data.nextServiceDate ? new Date(data.nextServiceDate) : null;
    }

    await service.save();
    return this.getServiceById(serviceId);
  }

  static async deleteServiceRecord(serviceId: string) {
    const result = await ServiceRecord.findByIdAndDelete(serviceId);
    if (!result) {
      throw AppError.notFound('Service record not found');
    }
    return { message: 'Service record deleted successfully' };
  }
}
