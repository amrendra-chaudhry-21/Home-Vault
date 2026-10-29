import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Household, IHousehold } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { Appliance, IAppliance } from '../models/Appliance';
import { QRToken } from '../models/QRToken';
import { ServiceRecord } from '../models/ServiceRecord';
import { Reminder } from '../models/Reminder';
import { HOUSEHOLD_ROLES, REMINDER_STATUS, REMINDER_TYPES, ApplianceCategory } from '../config/constants';
import { logger } from '../utils/logger';

export class SeedService {
  /**
   * Seeds demo household, realistic Indian home appliances, warranties,
   * service records, and cryptographically valid QR tokens.
   */
  static async seedDemoDataIfEmpty(): Promise<void> {
    try {
      const applianceCount = await Appliance.countDocuments();
      if (applianceCount > 0) {
        logger.info(`[SeedService] Database already populated (${applianceCount} appliances). Skipping initial seed.`);
        return;
      }

      logger.info('[SeedService] Database is empty. Seeding realistic HomeVault appliances and QR tokens...');

      // 1. Create or find Demo User
      const demoEmail = 'demo@homevault.in';
      let demoUser = await User.findOne({ email: demoEmail });
      if (!demoUser) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Password123!', salt);
        demoUser = await User.create({
          email: demoEmail,
          passwordHash,
          displayName: 'Sharma Household',
          emailVerified: true,
          notificationPreferences: {
            email: true,
            push: true,
            warrantyAlerts: true,
            serviceReminders: true,
          },
        });
        logger.info(`[SeedService] Created demo user: ${demoUser.email}`);
      }

      // 2. Create or find Household
      let household: IHousehold | null = await Household.findOne({ ownerUserId: demoUser._id });
      if (!household) {
        household = (await Household.create({
          name: "Sharma Household's Home",
          address: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103',
          timezone: 'Asia/Kolkata',
          ownerUserId: demoUser._id,
        })) as IHousehold;
        logger.info(`[SeedService] Created demo household: ${household.name}`);
      }

      // 3. Ensure Membership
      let member = await HouseholdMember.findOne({
        householdId: household._id,
        userId: demoUser._id,
      });
      if (!member) {
        member = await HouseholdMember.create({
          householdId: household._id,
          userId: demoUser._id,
          role: HOUSEHOLD_ROLES.OWNER,
          status: 'active',
        });
      }

      // 4. Seed Appliances with active QR Tokens & Analytics data
      const sampleAppliances: Array<{
        name: string;
        category: ApplianceCategory;
        brand: string;
        modelNumber: string;
        serialNumber: string;
        purchasePrice: number;
        seller: string;
        purchaseDate: Date;
        warrantyStartDate: Date;
        warrantyEndDate: Date;
        notes: string;
        services: Array<{
          serviceDate: Date;
          issueDescription: string;
          workPerformed: string;
          technicianName: string;
          providerName: string;
          cost: number;
          notes: string;
        }>;
        reminders: Array<{
          title: string;
          type: typeof REMINDER_TYPES[keyof typeof REMINDER_TYPES];
          dueAt: Date;
          notes: string;
        }>;
      }> = [
        {
          name: '1.5 Ton Dual Inverter Split AC',
          category: 'Air Conditioner',
          brand: 'LG',
          modelNumber: 'MS-Q18PWZX',
          serialNumber: 'LG-AC-2024-9981',
          purchasePrice: 44990,
          seller: 'Reliance Digital, Indiranagar',
          purchaseDate: new Date('2024-03-15'),
          warrantyStartDate: new Date('2024-03-15'),
          warrantyEndDate: new Date('2029-03-15'), // 5 Years
          notes: 'Includes 5-year comprehensive PCB warranty & 10-year compressor warranty.',
          services: [
            {
              serviceDate: new Date('2024-09-20'),
              issueDescription: 'Seasonal pre-summer check and deep cleaning',
              workPerformed: 'Filter washed, cooling coil sanitized, cooling gas pressure verified (120 PSI).',
              technicianName: 'Rajesh Kumar',
              providerName: 'LG Authorized Service Care',
              cost: 650,
              notes: 'Excellent condition, power consumption normal.',
            },
          ],
          reminders: [
            {
              title: 'Clean AC Dust Filters',
              type: REMINDER_TYPES.SCHEDULED_MAINTENANCE,
              dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // In 15 days
              notes: 'Clean nylon pre-filters with lukewarm water to maintain 5-star cooling efficiency.',
            },
          ],
        },
        {
          name: '324L Frost Free Double Door Refrigerator',
          category: 'Refrigerator',
          brand: 'Samsung',
          modelNumber: 'RT34T4513S8',
          serialNumber: 'SAM-REF-2023-8821',
          purchasePrice: 34500,
          seller: 'Croma Electronics, Koramangala',
          purchaseDate: new Date('2023-08-10'),
          warrantyStartDate: new Date('2023-08-10'),
          warrantyEndDate: new Date('2026-08-10'), // 3 Years
          notes: 'Twin Cooling Plus with Digital Inverter compressor (20-year motor warranty).',
          services: [
            {
              serviceDate: new Date('2024-02-15'),
              issueDescription: 'Annual door seal inspection',
              workPerformed: 'Door gasket cleaned with food-grade silicone spray; defrost cycle tested.',
              technicianName: 'Suresh Patel',
              providerName: 'Samsung SmartPlaza Care',
              cost: 0,
              notes: 'Complimentary service check.',
            },
          ],
          reminders: [
            {
              title: 'Inspect Freezer Door Seal & Defrost Drain',
              type: REMINDER_TYPES.SCHEDULED_MAINTENANCE,
              dueAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
              notes: 'Wipe door magnetic gasket to prevent cold air leakage.',
            },
          ],
        },
        {
          name: '55" 4K Ultra HD Smart LED Google TV',
          category: 'Television',
          brand: 'Sony Bravia',
          modelNumber: 'KD-55X75L',
          serialNumber: 'SONY-TV-2024-4410',
          purchasePrice: 57990,
          seller: 'Vijay Sales',
          purchaseDate: new Date('2024-01-20'),
          warrantyStartDate: new Date('2024-01-20'),
          warrantyEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Expiring in 20 days!
          notes: '4K Processor X1, Dolby Audio, Apple AirPlay support.',
          services: [],
          reminders: [
            {
              title: 'Warranty Expiring Soon - Review Extended Plan',
              type: REMINDER_TYPES.WARRANTY_EXPIRY,
              dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              notes: 'Check if Sony Extended Care protection is required before primary warranty lapses.',
            },
          ],
        },
        {
          name: 'Grand Plus Mineral RO Water Purifier',
          category: 'RO Water Purifier',
          brand: 'Kent',
          modelNumber: 'Grand+ 11001',
          serialNumber: 'KENT-RO-2024-1102',
          purchasePrice: 16500,
          seller: 'Amazon India',
          purchaseDate: new Date('2024-05-10'),
          warrantyStartDate: new Date('2024-05-10'),
          warrantyEndDate: new Date('2025-05-10'),
          notes: 'RO + UV + UF + TDS Controller with UV in storage tank.',
          services: [
            {
              serviceDate: new Date('2024-11-12'),
              issueDescription: 'Sediment filter replacement and TDS check',
              workPerformed: 'Replaced sediment cartridge & carbon filter. Output TDS measured at 110 PPM.',
              technicianName: 'Arun Verma',
              providerName: 'Kent Authorized Service Provider',
              cost: 1450,
              notes: 'Membrane in optimal condition.',
            },
          ],
          reminders: [
            {
              title: 'RO Filter & Membrane Replacement Due',
              type: REMINDER_TYPES.SCHEDULED_MAINTENANCE,
              dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: 'Replace post-carbon filter and check RO membrane reject water flow rate.',
            },
          ],
        },
      ];

      for (const item of sampleAppliances) {
        // 1. Create Appliance
        const appliance: IAppliance = await Appliance.create({
          householdId: household._id,
          name: item.name,
          category: item.category,
          brand: item.brand,
          modelNumber: item.modelNumber,
          serialNumber: item.serialNumber,
          purchasePrice: item.purchasePrice,
          seller: item.seller,
          purchaseDate: item.purchaseDate,
          warrantyStartDate: item.warrantyStartDate,
          warrantyEndDate: item.warrantyEndDate,
          notes: item.notes,
          createdBy: demoUser._id,
        });

        // 2. Generate cryptographically valid QR Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const qrTokenDoc = await QRToken.create({
          applianceId: appliance._id,
          householdId: household._id,
          tokenHash,
          createdBy: demoUser._id,
        });

        appliance.qrTokenId = qrTokenDoc._id;
        await appliance.save();

        // 3. Add Service Records
        for (const s of item.services) {
          await ServiceRecord.create({
            applianceId: appliance._id,
            householdId: household._id,
            serviceDate: s.serviceDate,
            issueDescription: s.issueDescription,
            workPerformed: s.workPerformed,
            technicianName: s.technicianName,
            providerName: s.providerName,
            cost: s.cost,
            notes: s.notes,
            createdBy: demoUser._id,
          });
        }

        // 4. Add Reminders
        for (const r of item.reminders) {
          await Reminder.create({
            householdId: household._id,
            applianceId: appliance._id,
            title: r.title,
            type: r.type,
            dueAt: r.dueAt,
            notes: r.notes,
            status: REMINDER_STATUS.PENDING,
            createdBy: demoUser._id,
          });
        }

        logger.info(`[SeedService] Seeded appliance: ${item.brand} ${item.name} with QR token [${rawToken.substring(0, 12)}...]`);
      }

      logger.info('[SeedService] ✅ Database successfully seeded with 4 realistic home appliances & QR passes!');
    } catch (err: any) {
      logger.error('[SeedService] Failed to seed demo data:', err?.message || err);
    }
  }

  /**
   * Auto-populates a specific household with sample appliances if empty.
   */
  static async seedHouseholdIfEmpty(householdId: string, userId: string): Promise<number> {
    const existing = await Appliance.countDocuments({
      householdId: new Types.ObjectId(householdId),
      archivedAt: null,
    });
    if (existing > 0) return existing;

    const sampleItems: Array<{
      name: string;
      category: ApplianceCategory;
      brand: string;
      modelNumber: string;
      serialNumber: string;
      purchasePrice: number;
      seller: string;
      purchaseDate: Date;
      warrantyStartDate: Date;
      warrantyEndDate: Date;
      notes: string;
    }> = [
      {
        name: '1.5 Ton Dual Inverter Split AC',
        category: 'Air Conditioner',
        brand: 'LG',
        modelNumber: 'MS-Q18PWZX',
        serialNumber: 'LG-AC-2024-9981',
        purchasePrice: 44990,
        seller: 'Reliance Digital',
        purchaseDate: new Date('2024-03-15'),
        warrantyStartDate: new Date('2024-03-15'),
        warrantyEndDate: new Date('2029-03-15'),
        notes: 'Includes 5-year PCB warranty & 10-year compressor warranty.',
      },
      {
        name: '324L Double Door Refrigerator',
        category: 'Refrigerator',
        brand: 'Samsung',
        modelNumber: 'RT34T4513S8',
        serialNumber: 'SAM-REF-2023-8821',
        purchasePrice: 34500,
        seller: 'Croma',
        purchaseDate: new Date('2023-08-10'),
        warrantyStartDate: new Date('2023-08-10'),
        warrantyEndDate: new Date('2026-08-10'),
        notes: 'Twin Cooling Plus with digital inverter compressor.',
      },
    ];

    for (const item of sampleItems) {
      const appliance: IAppliance = await Appliance.create({
        householdId: new Types.ObjectId(householdId),
        name: item.name,
        category: item.category,
        brand: item.brand,
        modelNumber: item.modelNumber,
        serialNumber: item.serialNumber,
        purchasePrice: item.purchasePrice,
        seller: item.seller,
        purchaseDate: item.purchaseDate,
        warrantyStartDate: item.warrantyStartDate,
        warrantyEndDate: item.warrantyEndDate,
        notes: item.notes,
        createdBy: new Types.ObjectId(userId),
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const qrTokenDoc = await QRToken.create({
        applianceId: appliance._id,
        householdId: new Types.ObjectId(householdId),
        tokenHash,
        createdBy: new Types.ObjectId(userId),
      });

      appliance.qrTokenId = qrTokenDoc._id;
      await appliance.save();

      // Seed a sample service
      await ServiceRecord.create({
        applianceId: appliance._id,
        householdId: new Types.ObjectId(householdId),
        serviceDate: new Date('2024-09-20'),
        issueDescription: 'Routine Maintenance',
        workPerformed: 'Routine seasonal check and filter wash.',
        technicianName: 'Rajesh Kumar',
        providerName: `${item.brand} Official Service Care`,
        cost: 650,
        notes: 'Routine maintenance complete.',
        createdBy: new Types.ObjectId(userId),
      });
    }

    return sampleItems.length;
  }
}
