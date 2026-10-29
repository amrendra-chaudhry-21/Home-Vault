# HomeVault Setup & Run Guide

## System Requirements
- Node.js >= 18 (Tested on v22.20.0)
- MongoDB Atlas or local MongoDB instance
- Expo CLI & React Native environment

## Backend Configuration
1. Navigate to `/backend`
2. Create or verify `.env` (refer to `.env.example`):
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb+srv://...
   JWT_ACCESS_SECRET=your_super_secret_access_key_123456
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_123456
   ACCESS_TOKEN_TTL=15m
   REFRESH_TOKEN_TTL=7d
   CORS_ORIGINS=*
   UPLOAD_STORAGE_DRIVER=local
   LOCAL_UPLOAD_DIR=public/uploads
   ```
3. Run `npm install`
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Server will listen on `http://localhost:5001` with API health at `http://localhost:5001/health`.

## Mobile Application Configuration
1. Navigate to `/frontend`
2. Run `npm install`
3. Configure `API_URL` in `src/config/env.ts`:
   - For Android Emulator: `http://10.0.2.2:5001/api/v1`
   - For Physical Phone / Expo Go: `http://<your-lan-ip>:5001/api/v1`
   - For Web / Local: `http://localhost:5001/api/v1`
4. Run mobile app:
   ```bash
   npm start
   # or
   npx expo start --web
   ```
