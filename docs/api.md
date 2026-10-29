# HomeVault API Documentation — Version 1 (/api/v1)

Base URL: `http://localhost:5001/api/v1` (or local network IP / cloud host)

Standard Response Envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

Standard Error Envelope:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INTERNAL_ERROR",
    "message": "Human readable description",
    "details": []
  }
}
```

---

## 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Register user `{ email, password, displayName }`
- `POST /api/v1/auth/login`: Login user `{ email, password }`
- `POST /api/v1/auth/refresh`: Rotate refresh token `{ refreshToken }`
- `POST /api/v1/auth/logout`: Revoke active refresh token `{ refreshToken }`
- `GET  /api/v1/auth/me`: Get current authenticated user profile

## 2. Households (`/api/v1/households`)
- `POST   /api/v1/households`: Create a household `{ name, address, timezone }`
- `GET    /api/v1/households`: List households user has membership in
- `GET    /api/v1/households/:householdId`: Get household profile & stats
- `PATCH  /api/v1/households/:householdId`: Update household details
- `DELETE /api/v1/households/:householdId`: Archive household (owner only)
- `GET    /api/v1/households/:householdId/dashboard`: Executive KPI dashboard (counts, expiring soon, upcoming maintenance, recent repairs)

## 3. Appliances (`/api/v1/households/:householdId/appliances` & `/api/v1/appliances/:applianceId`)
- `POST   /api/v1/households/:householdId/appliances`: Register an appliance
- `GET    /api/v1/households/:householdId/appliances`: List with filters (`category`, `warrantyStatus`, `search`, `page`, `limit`)
- `GET    /api/v1/appliances/:applianceId`: Detailed appliance profile with service history & docs
- `PATCH  /api/v1/appliances/:applianceId`: Update appliance specs, warranty dates, etc.
- `DELETE /api/v1/appliances/:applianceId`: Soft delete/archive appliance

## 4. Service History (`/api/v1/appliances/:applianceId/services` & `/api/v1/services/:serviceId`)
- `POST   /api/v1/appliances/:applianceId/services`: Add maintenance record
- `GET    /api/v1/appliances/:applianceId/services`: Chronological service log
- `GET    /api/v1/services/:serviceId`: Get single service record
- `PATCH  /api/v1/services/:serviceId`: Update service details
- `DELETE /api/v1/services/:serviceId`: Remove service record

## 5. Reminders (`/api/v1/households/:householdId/reminders` & `/api/v1/reminders/:reminderId`)
- `GET    /api/v1/households/:householdId/reminders`: List active / upcoming reminders
- `POST   /api/v1/appliances/:applianceId/reminders`: Schedule custom maintenance reminder
- `PATCH  /api/v1/reminders/:reminderId`: Mark completed or dismissed
- `DELETE /api/v1/reminders/:reminderId`: Delete reminder

## 6. Documents & Invoices (`/api/v1/appliances/:applianceId/documents`)
- `POST   /api/v1/appliances/:applianceId/documents`: Multipart upload (PDF, PNG, JPG, WebP)
- `GET    /api/v1/appliances/:applianceId/documents`: List attached documents
- `GET    /api/v1/documents/:documentId/download`: Secure authenticated stream / download
- `DELETE /api/v1/documents/:documentId`: Remove document

## 7. QR Codes (`/api/v1/appliances/:applianceId/qr` & `/api/v1/qr/:token`)
- `POST   /api/v1/appliances/:applianceId/qr`: Generate cryptographically secure QR token
- `GET    /api/v1/qr/:token`: Authenticated QR token resolution to appliance record
