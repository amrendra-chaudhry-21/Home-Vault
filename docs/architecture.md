# HomeVault (GrihaVault) — System Architecture & Technical Specification

## 1. Executive Summary
**HomeVault** (brand name: **GrihaVault / Home Memory**) is a production-grade digital household appliance inventory and lifecycle maintenance management system tailored for Indian households, landlords, and property managers.

It solves the critical problem of lost warranty cards, misplaced tax invoices, untracked repairs, missed AMC (Annual Maintenance Contract) visits, and unorganized household electronics.

## 2. Core Architectural Principles (15+ Years Architecture Standards)
- **Modular Monolith**: Clean separation of concerns with layered architecture (Controllers -> Services -> Repositories/Models).
- **API Versioning**: All REST endpoints are strictly routed under `/api/v1` for backward compatibility.
- **Fail-Safe Tenancy (Household Authorization)**: Every appliance, service record, document, and reminder is scoped to a `householdId`. Cross-household data leaks (IDOR) are strictly prevented via centralized authorization middleware.
- **Security by Design**: 
  - JWT access tokens (short-lived, 15m) + cryptographic refresh token rotation.
  - Passwords hashed with bcrypt (salt rounds 10).
  - QR codes resolve cryptographic SHA-256 tokens requiring authorization.
  - Documents stored with UUID storage keys, private storage driver abstraction, and authenticated streaming.
- **Resilient Reminders**: Idempotent reminder generator evaluating warranty expiry (30 days, 7 days, 1 day prior) and scheduled maintenance intervals in `Asia/Kolkata` timezone.

## 3. High-Level System Architecture

```mermaid
graph TD
    Client[React Native / Expo Mobile App] -->|HTTPS /api/v1| ReverseProxy[Express API Gateway / Router]
    
    subgraph Express Backend
        ReverseProxy --> AuthMW[JWT & Household Auth Middleware]
        AuthMW --> RateLimit[Rate Limiter & Helmet]
        RateLimit --> Controllers[Controllers Layer]
        Controllers --> Validation[Zod Request Validation]
        Controllers --> Services[Business Services Layer]
        Services --> Storage[Storage Adapter (Local / S3)]
        Services --> Models[Mongoose Domain Models]
    end

    subgraph Data & Storage
        Models --> MongoDB[(MongoDB Atlas)]
        Storage --> DiskStorage[(Private Secure File Storage)]
    end
```

## 4. Domain Data Model & Entity Relations
- **User**: Authentication, profile, notification preferences.
- **Household**: Household profile, address, timezone, owner reference.
- **HouseholdMember**: Multi-user household collaboration with roles (`owner`, `admin`, `member`).
- **Appliance**: Appliance inventory (Category: AC, Refrigerator, Washing Machine, Television, RO, Geyser, Microwave, etc.), Brand, Model, Serial No, Purchase Date, Warranty Start/End Dates, Price in INR (₹).
- **ServiceRecord**: Maintenance, repairs, technician details, cost in INR, next service date.
- **Reminder**: Scheduled alerts for warranty expiry, maintenance, AMC checks, status (`pending`, `completed`, `dismissed`).
- **Document**: Private receipts, invoices, warranty cards with MIME verification.
- **QRToken**: Cryptographic appliance token hash with status and revocation.
- **RefreshToken**: Secure rotated refresh token sessions.
