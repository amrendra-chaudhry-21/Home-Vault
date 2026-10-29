import { Types } from 'mongoose';
import { Appliance, IAppliance } from '../models/Appliance';
import { ServiceRecord } from '../models/ServiceRecord';
import { DocumentModel } from '../models/Document';
import { Reminder } from '../models/Reminder';
import { calculateWarrantyStatus } from '../utils/dateUtils';
import { REMINDER_TYPES, REMINDER_STATUS, WARRANTY_STATUS, ApplianceCategory } from '../config/constants';
import { AppError } from '../utils/appError';

export interface ApplianceQueryOptions {
  page?: number;
  limit?: number;
  category?: string;
  warrantyStatus?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'warranty_asc' | 'name';
}

export class ApplianceService {
  static async createAppliance(
    householdId: string,
    userId: string,
    data: {
      name: string;
      category: ApplianceCategory;
      brand: string;
      modelNumber: string;
      serialNumber?: string;
      purchaseDate?: string | Date | null;
      warrantyStartDate?: string | Date | null;
      warrantyEndDate?: string | Date | null;
      purchasePrice?: number | null;
      seller?: string;
      notes?: string;
    }
  ): Promise<IAppliance> {
    const appliance = await Appliance.create({
      householdId: new Types.ObjectId(householdId),
      name: data.name,
      category: data.category,
      brand: data.brand,
      modelNumber: data.modelNumber,
      serialNumber: data.serialNumber || '',
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : null,
      warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : null,
      purchasePrice: data.purchasePrice || null,
      seller: data.seller || '',
      notes: data.notes || '',
      createdBy: new Types.ObjectId(userId),
    });

    // Auto-create warranty expiry reminder if warrantyEndDate is set in the future
    if (appliance.warrantyEndDate) {
      const now = new Date();
      if (appliance.warrantyEndDate > now) {
        // Schedule reminder 14 days before expiry or on expiry date
        const reminderDate = new Date(appliance.warrantyEndDate);
        reminderDate.setDate(reminderDate.getDate() - 14);
        const finalDueAt = reminderDate > now ? reminderDate : appliance.warrantyEndDate;

        await Reminder.create({
          householdId: appliance.householdId,
          applianceId: appliance._id,
          type: REMINDER_TYPES.WARRANTY_EXPIRY,
          title: `Warranty expiring soon for ${appliance.brand} ${appliance.name}`,
          notes: `Model: ${appliance.modelNumber}. Expiry date: ${appliance.warrantyEndDate.toISOString().slice(0, 10)}`,
          dueAt: finalDueAt,
          status: REMINDER_STATUS.PENDING,
          createdBy: new Types.ObjectId(userId),
        });
      }
    }

    return {
      id: appliance._id.toString(),
      _id: appliance._id.toString(),
      householdId: appliance.householdId.toString(),
      name: appliance.name,
      category: appliance.category,
      brand: appliance.brand,
      modelNumber: appliance.modelNumber,
      serialNumber: appliance.serialNumber,
      purchaseDate: appliance.purchaseDate,
      warrantyStartDate: appliance.warrantyStartDate,
      warrantyEndDate: appliance.warrantyEndDate,
      purchasePrice: appliance.purchasePrice,
      seller: appliance.seller,
      notes: appliance.notes,
      createdAt: appliance.createdAt,
      updatedAt: appliance.updatedAt,
    } as any;
  }

  static async getHouseholdAppliances(
    householdId: string,
    options: ApplianceQueryOptions
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      householdId: new Types.ObjectId(householdId),
      archivedAt: null,
    };

    if (options.category) {
      filter.category = options.category;
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { modelNumber: searchRegex },
        { serialNumber: searchRegex },
      ];
    }

    // Warranty status filters
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    if (options.warrantyStatus === WARRANTY_STATUS.ACTIVE) {
      filter.warrantyEndDate = { $gt: in30Days };
    } else if (options.warrantyStatus === WARRANTY_STATUS.EXPIRING_SOON) {
      filter.warrantyEndDate = { $gte: now, $lte: in30Days };
    } else if (options.warrantyStatus === WARRANTY_STATUS.EXPIRED) {
      filter.warrantyEndDate = { $lt: now };
    }

    let sortObj: any = { createdAt: -1 };
    if (options.sort === 'oldest') sortObj = { createdAt: 1 };
    else if (options.sort === 'warranty_asc') sortObj = { warrantyEndDate: 1 };
    else if (options.sort === 'name') sortObj = { name: 1 };

    const [appliances, total] = await Promise.all([
      Appliance.find(filter).sort(sortObj).skip(skip).limit(limit),
      Appliance.countDocuments(filter),
    ]);

    const items = appliances.map((app) => {
      const { status: warrantyStatus, daysRemaining } = calculateWarrantyStatus(
        app.warrantyEndDate
      );
      return {
        id: app._id.toString(),
        householdId: app.householdId.toString(),
        name: app.name,
        category: app.category,
        brand: app.brand,
        modelNumber: app.modelNumber,
        serialNumber: app.serialNumber,
        purchaseDate: app.purchaseDate,
        warrantyStartDate: app.warrantyStartDate,
        warrantyEndDate: app.warrantyEndDate,
        purchasePrice: app.purchasePrice,
        seller: app.seller,
        notes: app.notes,
        warrantyStatus,
        warrantyDaysRemaining: daysRemaining,
        createdAt: app.createdAt,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getApplianceById(applianceId: string) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    const { status: warrantyStatus, daysRemaining } = calculateWarrantyStatus(
      appliance.warrantyEndDate
    );

    // Fetch related services, documents, and reminders in parallel
    const [services, documents, reminders] = await Promise.all([
      ServiceRecord.find({ applianceId: appliance._id })
        .sort({ serviceDate: -1 })
        .limit(10),
      DocumentModel.find({ applianceId: appliance._id }).sort({ createdAt: -1 }),
      Reminder.find({
        applianceId: appliance._id,
        status: REMINDER_STATUS.PENDING,
      }).sort({ dueAt: 1 }),
    ]);

    return {
      id: appliance._id.toString(),
      householdId: appliance.householdId.toString(),
      name: appliance.name,
      category: appliance.category,
      brand: appliance.brand,
      modelNumber: appliance.modelNumber,
      serialNumber: appliance.serialNumber,
      purchaseDate: appliance.purchaseDate,
      warrantyStartDate: appliance.warrantyStartDate,
      warrantyEndDate: appliance.warrantyEndDate,
      purchasePrice: appliance.purchasePrice,
      seller: appliance.seller,
      notes: appliance.notes,
      warrantyStatus,
      warrantyDaysRemaining: daysRemaining,
      qrTokenId: appliance.qrTokenId?.toString() || null,
      services: services.map((s) => ({
        id: s._id.toString(),
        serviceDate: s.serviceDate,
        issueDescription: s.issueDescription,
        workPerformed: s.workPerformed,
        cost: s.cost,
        technicianName: s.technicianName,
        providerName: s.providerName,
        nextServiceDate: s.nextServiceDate,
      })),
      documents: documents.map((d) => ({
        id: d._id.toString(),
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        documentType: d.documentType,
        createdAt: d.createdAt,
      })),
      reminders: reminders.map((r) => ({
        id: r._id.toString(),
        type: r.type,
        title: r.title,
        dueAt: r.dueAt,
        status: r.status,
      })),
      createdAt: appliance.createdAt,
      updatedAt: appliance.updatedAt,
    };
  }

  static async updateAppliance(
    applianceId: string,
    data: Partial<{
      name: string;
      category: ApplianceCategory;
      brand: string;
      modelNumber: string;
      serialNumber: string;
      purchaseDate: string | Date | null;
      warrantyStartDate: string | Date | null;
      warrantyEndDate: string | Date | null;
      purchasePrice: number | null;
      seller: string;
      notes: string;
    }>
  ) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    if (data.name !== undefined) appliance.name = data.name;
    if (data.category !== undefined) appliance.category = data.category;
    if (data.brand !== undefined) appliance.brand = data.brand;
    if (data.modelNumber !== undefined) appliance.modelNumber = data.modelNumber;
    if (data.serialNumber !== undefined) appliance.serialNumber = data.serialNumber;
    if (data.purchaseDate !== undefined)
      appliance.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    if (data.warrantyStartDate !== undefined)
      appliance.warrantyStartDate = data.warrantyStartDate ? new Date(data.warrantyStartDate) : null;
    if (data.warrantyEndDate !== undefined) {
      appliance.warrantyEndDate = data.warrantyEndDate ? new Date(data.warrantyEndDate) : null;

      // Update or create warranty expiry reminder
      if (appliance.warrantyEndDate && appliance.warrantyEndDate > new Date()) {
        const reminderDate = new Date(appliance.warrantyEndDate);
        reminderDate.setDate(reminderDate.getDate() - 14);
        const finalDueAt = reminderDate > new Date() ? reminderDate : appliance.warrantyEndDate;

        await Reminder.findOneAndUpdate(
          {
            applianceId: appliance._id,
            type: REMINDER_TYPES.WARRANTY_EXPIRY,
            status: REMINDER_STATUS.PENDING,
          },
          {
            $set: {
              dueAt: finalDueAt,
              title: `Warranty expiring soon for ${appliance.brand} ${appliance.name}`,
              notes: `Model: ${appliance.modelNumber}. Expiry date: ${appliance.warrantyEndDate.toISOString().slice(0, 10)}`,
            },
          },
          { upsert: true }
        );
      }
    }
    if (data.purchasePrice !== undefined) appliance.purchasePrice = data.purchasePrice;
    if (data.seller !== undefined) appliance.seller = data.seller;
    if (data.notes !== undefined) appliance.notes = data.notes;

    await appliance.save();

    return this.getApplianceById(applianceId);
  }

  static async archiveAppliance(applianceId: string) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    appliance.archivedAt = new Date();
    await appliance.save();

    // Mark pending reminders dismissed
    await Reminder.updateMany(
      { applianceId: appliance._id, status: REMINDER_STATUS.PENDING },
      { $set: { status: REMINDER_STATUS.DISMISSED, dismissedAt: new Date() } }
    );

    return { message: 'Appliance archived successfully' };
  }

  static async getDashboard(householdId: string) {
    const householdObjId = new Types.ObjectId(householdId);
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      totalAppliances,
      expiringSoonAppliances,
      upcomingReminders,
      recentServices,
    ] = await Promise.all([
      Appliance.countDocuments({ householdId: householdObjId, archivedAt: null }),
      Appliance.find({
        householdId: householdObjId,
        archivedAt: null,
        warrantyEndDate: { $gte: now, $lte: in30Days },
      })
        .select('name brand modelNumber category warrantyEndDate')
        .sort({ warrantyEndDate: 1 })
        .limit(5),
      Reminder.find({
        householdId: householdObjId,
        status: REMINDER_STATUS.PENDING,
        dueAt: { $gte: now },
      })
        .populate<{ applianceId: { name: string; brand: string } }>('applianceId', 'name brand')
        .sort({ dueAt: 1 })
        .limit(5),
      ServiceRecord.find({ householdId: householdObjId })
        .populate<{ applianceId: { name: string; brand: string } }>('applianceId', 'name brand')
        .sort({ serviceDate: -1 })
        .limit(5),
    ]);

    return {
      stats: {
        totalAppliances,
        expiringSoonCount: expiringSoonAppliances.length,
        upcomingRemindersCount: upcomingReminders.length,
      },
      expiringSoon: expiringSoonAppliances.map((app) => {
        const { daysRemaining } = calculateWarrantyStatus(app.warrantyEndDate);
        return {
          id: app._id.toString(),
          name: app.name,
          brand: app.brand,
          category: app.category,
          warrantyEndDate: app.warrantyEndDate,
          daysRemaining,
        };
      }),
      upcomingReminders: upcomingReminders.map((r) => ({
        id: r._id.toString(),
        applianceName: r.applianceId ? `${r.applianceId.brand} ${r.applianceId.name}` : 'Appliance',
        title: r.title,
        type: r.type,
        dueAt: r.dueAt,
      })),
      recentServices: recentServices.map((s) => ({
        id: s._id.toString(),
        applianceName: s.applianceId ? `${s.applianceId.brand} ${s.applianceId.name}` : 'Appliance',
        serviceDate: s.serviceDate,
        workPerformed: s.workPerformed,
        cost: s.cost,
        technicianName: s.technicianName,
        nextServiceDate: s.nextServiceDate,
      })),
    };
  }
}
