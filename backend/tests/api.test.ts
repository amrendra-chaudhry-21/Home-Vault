import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { Household } from '../src/models/Household';
import { HouseholdMember } from '../src/models/HouseholdMember';
import { Appliance } from '../src/models/Appliance';
import { ServiceRecord } from '../src/models/ServiceRecord';
import { Reminder } from '../src/models/Reminder';
import { QRToken } from '../src/models/QRToken';

const app = createApp();

describe('HomeVault (GrihaVault / Home Memory) Comprehensive API Test Suite', () => {
  let user1Token: string;
  let user1Id: string;
  let household1Id: string;
  let user2Token: string;
  let applianceId: string;
  let qrTokenString: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up test data
    if (user1Id) {
      await User.deleteMany({ email: { $in: ['test_user1@homevault.in', 'test_user2@homevault.in'] } });
      await Household.deleteMany({ name: { $regex: /Test/i } });
      await Appliance.deleteMany({ brand: 'Samsung Test' });
      await ServiceRecord.deleteMany({ issueDescription: { $regex: /Test/i } });
      await Reminder.deleteMany({ title: { $regex: /Test/i } });
      await QRToken.deleteMany({});
    }
    await mongoose.connection.close();
  });

  // 1. Health Check
  it('GET /health - should return UP status and database info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('HomeVault API');
  });

  // 2. Auth: Register User 1
  it('POST /api/v1/auth/register - should register a new user and auto-create household', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_user1@homevault.in',
        password: 'Password123!',
        displayName: 'Aarav Sharma',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('test_user1@homevault.in');
    expect(res.body.data.defaultHouseholdId).toBeDefined();

    user1Token = res.body.data.accessToken;
    user1Id = res.body.data.user.id;
    household1Id = res.body.data.defaultHouseholdId;
  });

  // 3. Auth: Login User 1
  it('POST /api/v1/auth/login - should authenticate user and issue tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test_user1@homevault.in',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    user1Token = res.body.data.accessToken;
  });

  // 4. Register User 2 (for cross-tenant IDOR tests)
  it('POST /api/v1/auth/register - should register second user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_user2@homevault.in',
        password: 'Password123!',
        displayName: 'Priya Verma',
      });

    expect(res.status).toBe(201);
    user2Token = res.body.data.accessToken;
  });

  // 5. Household: List user households
  it('GET /api/v1/households - should return households for user 1', async () => {
    const res = await request(app)
      .get('/api/v1/households')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Appliance: Create Appliance in Household
  it('POST /api/v1/households/:householdId/appliances - should add appliance & auto-schedule warranty reminder', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90); // 90 days in future

    const res = await request(app)
      .post(`/api/v1/households/${household1Id}/appliances`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Smart Inverter Refrigerator',
        category: 'Refrigerator',
        brand: 'Samsung Test',
        modelNumber: 'RT28T3922S8/HL',
        serialNumber: 'SN-TEST-998822',
        purchasePrice: 28990,
        seller: 'Croma Noida',
        purchaseDate: '2025-01-15',
        warrantyStartDate: '2025-01-15',
        warrantyEndDate: futureDate.toISOString().slice(0, 10),
        notes: 'Includes 10 year compressor warranty',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Smart Inverter Refrigerator');
    expect(res.body.data.brand).toBe('Samsung Test');

    applianceId = res.body.data._id;
  });

  // 7. Appliance: List appliances with filter
  it('GET /api/v1/households/:householdId/appliances - should list appliances', async () => {
    const res = await request(app)
      .get(`/api/v1/households/${household1Id}/appliances?search=Samsung`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].warrantyStatus).toBe('ACTIVE');
  });

  // 8. IDOR Protection: User 2 accessing User 1 appliance must be denied 403 FORBIDDEN
  it('GET /api/v1/appliances/:applianceId - cross-tenant access must be denied with 403', async () => {
    const res = await request(app)
      .get(`/api/v1/appliances/${applianceId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 9. Appliance: User 1 accesses their own appliance details
  it('GET /api/v1/appliances/:applianceId - should return full appliance details', async () => {
    const res = await request(app)
      .get(`/api/v1/appliances/${applianceId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(applianceId);
    expect(res.body.data.warrantyStatus).toBe('ACTIVE');
  });

  // 10. Service Record: Add maintenance history
  it('POST /api/v1/appliances/:applianceId/services - should record service history', async () => {
    const nextService = new Date();
    nextService.setDate(nextService.getDate() + 180);

    const res = await request(app)
      .post(`/api/v1/appliances/${applianceId}/services`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        serviceDate: '2026-02-10',
        issueDescription: 'Test routine gas pressure check and cooling coil cleaning',
        workPerformed: 'Checked pressure (120 psi), cleaned rear condenser coils',
        cost: 650,
        technicianName: 'Rajesh Kumar',
        providerName: 'Urban Company',
        notes: 'Coils in great condition',
        nextServiceDate: nextService.toISOString().slice(0, 10),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cost).toBe(650);
  });

  // 11. Reminders: Check auto-generated reminders
  it('GET /api/v1/households/:householdId/reminders - should return upcoming reminders', async () => {
    const res = await request(app)
      .get(`/api/v1/households/${household1Id}/reminders`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // 12. QR Code: Generate QR Code
  it('POST /api/v1/appliances/:applianceId/qr - should generate cryptographic QR token and data URL', async () => {
    const res = await request(app)
      .post(`/api/v1/appliances/${applianceId}/qr`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    qrTokenString = res.body.data.token;
  });

  // 13. QR Code: Resolve QR Code securely
  it('GET /api/v1/qr/:token - should resolve appliance for authorized user', async () => {
    const res = await request(app)
      .get(`/api/v1/qr/${qrTokenString}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applianceId).toBe(applianceId);
  });

  // 14. Dashboard: Get household dashboard KPI
  it('GET /api/v1/households/:householdId/dashboard - should return dashboard summary', async () => {
    const res = await request(app)
      .get(`/api/v1/households/${household1Id}/dashboard`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.totalAppliances).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data.recentServices)).toBe(true);
  });
});
