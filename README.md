# HomeVault (गृह वॉल्ट / GrihaVault • Home Memory)

> **Enterprise-Grade Digital Home Inventory & Maintenance Management Platform**
> Built for Indian households, landlords, and property managers.

---

## 🌟 Unique App Identity & Highlights

- **Brand Name**: **HomeVault** (Brand identity: **गृह वॉल्ट / GrihaVault • Home Memory**)
- **Signature Aesthetics**: Ultra-sleek Chai Dark Mode (`#0A0A0A` background with `#FE6E00` Chai Orange and Amber accents).
- **Core Currencies & Timezone**: Indian Rupee (`₹` INR) & `Asia/Kolkata` (IST).
- **15+ Years Architecture Standards**:
  - API versioned strictly under `/api/v1`
  - Multi-tenant household access control (IDOR prevention)
  - Cryptographic refresh token rotation & bcrypt password hashing
  - SHA-256 hashed cryptographic QR code tokens
  - Idempotent warranty & maintenance reminder engine
  - Private document storage with MIME validation & size restrictions

---

## 🏗️ Technology Stack

### Mobile Application (`/frontend`)
- **Framework**: React Native with Expo (v58) & TypeScript
- **Navigation**: State-driven Screen Router with Bottom Tab Navigation
- **UI & Theme**: ChaiCode Core Dark Theme (`#0A0A0A`, `#121214`, `#18181B`, `#FE6E00`)
- **API Client**: Strongly typed Fetch client with automatic token injection & error interceptors
- **Icons**: Expo Vector Icons (`Ionicons`)

### Backend (`/backend`)
- **Runtime**: Node.js (v22) & Express.js with TypeScript
- **Database**: MongoDB Atlas / Mongoose ORM
- **Security**: Helmet, CORS, Express-Rate-Limit, bcryptjs, jsonwebtoken (JWT)
- **Validation**: Zod schema validation for body, query, and params
- **QR Engine**: Cryptographic random token + high-res base64 QR generation
- **Testing**: Jest & Supertest integration suite (14/14 tests passing)

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Development Server
npm run dev

# Run Automated Test Suite
npm test
```

Server starts at: `http://localhost:5001`  
Health check: `http://localhost:5001/health`  
API v1 root: `http://localhost:5001/api/v1`

### 2. Mobile App Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Expo dev server
npm start

# Or start for Web
npm run web
```

---

## 📚 Technical Documentation

- [Architecture & Domain Model](file:///Users/amrendrachaudhary/ZillaRoad/docs/architecture.md)
- [API v1 Specification](file:///Users/amrendrachaudhary/ZillaRoad/docs/api.md)
- [Setup & Run Guide](file:///Users/amrendrachaudhary/ZillaRoad/docs/setup.md)
- [Security & Threat Model](file:///Users/amrendrachaudhary/ZillaRoad/docs/security.md)
