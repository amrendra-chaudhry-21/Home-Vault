# HomeVault Security & Threat Model

## 1. Multi-Tenant Household Authorization (IDOR Prevention)
Every resource (Appliance, ServiceRecord, Reminder, Document, QR) belongs to a `householdId`.
The `requireHouseholdAccess(role)` middleware resolves the user's membership in the household before delegating to the controller.

## 2. Authentication & Credential Storage
- Passwords salted with bcrypt (10 rounds).
- Access tokens expire after 15 minutes.
- Refresh tokens are hashed and stored in MongoDB with device metadata and revoked upon rotation.

## 3. QR Code Cryptographic Safety
- QR codes do not embed raw model IDs, invoice URLs, or personal data.
- They embed a 256-bit CSPRNG (cryptographically secure pseudorandom number generator) hex string.
- Only the SHA-256 hash is persisted in the database.
- Scanning a QR code requires valid Bearer authentication and membership in the target household.

## 4. Secure Document Storage & Anti-Path Traversal
- File uploads are validated by MIME type (application/pdf, image/jpeg, image/png, image/webp).
- Maximum upload size is strictly capped at 10MB.
- Original file names are stripped; a sanitized UUID is generated for disk storage.
- Download endpoints verify household authorization and use strict file path resolution within the upload directory.
