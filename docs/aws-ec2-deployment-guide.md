# 🚀 AWS EC2 Free Tier ($0) CI/CD Deployment Guide for HomeVault

This guide walks you through deploying the **HomeVault Backend API** to an **AWS EC2 Free Tier (`t2.micro`)** instance using automated **GitHub Actions CI/CD**.

---

## 📌 Architecture Highlights
- **Server**: AWS EC2 `t2.micro` (Ubuntu 24.04 LTS) – **100% Free Tier (750 hours/month)**
- **Memory Optimization**: 2GB Swap Memory enabled to eliminate Out-Of-Memory (OOM) risks on 1GB RAM instances.
- **Containerization**: Multi-stage Docker production image running as non-root user `node`.
- **Pipeline**: Automated GitHub Actions testing & zero-downtime SSH deployment on push to `main`.
- **Database**: MongoDB Atlas M0 Free Tier cluster.

---

## 🛠️ Step 1: Launch Your AWS EC2 Free Tier Instance

1. Log in to [AWS Management Console](https://console.aws.amazon.com/ec2).
2. Go to **EC2 Dashboard** and click **Launch Instance**.
3. Configure the following settings:
   - **Name**: `homevault-backend-prod`
   - **Application and OS Images (AMI)**: **Ubuntu Server 24.04 LTS** (marked *Free tier eligible*).
   - **Instance Type**: **t2.micro** (or `t3.micro` depending on your region, verify it says *Free tier eligible*).
   - **Key Pair (login)**:
     - Click **Create new key pair**.
     - Name: `homevault-ec2-key`.
     - Key pair type: `RSA`.
     - Private key file format: `.pem` (for OpenSSH).
     - Click **Create key pair** and save `homevault-ec2-key.pem` securely on your computer.
   - **Network settings (Firewall / Security Group)**:
     - Select **Create security group**.
     - Check **Allow SSH traffic from** -> `Anywhere (0.0.0.0/0)` (or your IP).
     - Check **Allow HTTP traffic from the internet** (Port 80).
     - Check **Allow HTTPS traffic from the internet** (Port 443).
     - Click **Edit network settings** and add a custom TCP rule:
       - **Type**: Custom TCP
       - **Port range**: `5001`
       - **Source**: `Anywhere (0.0.0.0/0)`
       - **Description**: `HomeVault Express API Port`
   - **Configure storage**:
     - Change storage from `8 GiB` to **`20 GiB`** (gp3) — AWS Free Tier permits up to 30 GiB free.
4. Click **Launch Instance**.
5. Once running, copy your instance's **Public IPv4 address** (e.g., `13.232.xxx.xxx`).

---

## ⚙️ Step 2: One-Time Server Setup (Takes 60 Seconds)

1. Open your terminal on your computer and SSH into your EC2 instance:
   ```bash
   chmod 400 path/to/homevault-ec2-key.pem
   ssh -i path/to/homevault-ec2-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

2. Once logged in, run this single command to enable 2GB swap space and install Docker:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO>/main/scripts/ec2-setup.sh | bash
   ```
   *Or manually copy and paste the contents of `scripts/ec2-setup.sh` on the server:*
   ```bash
   nano setup.sh
   # Paste contents of scripts/ec2-setup.sh, then:
   chmod +x setup.sh && ./setup.sh
   ```

3. Log out and log back in so Docker permissions take effect:
   ```bash
   exit
   ssh -i path/to/homevault-ec2-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

---

## 🔐 Step 3: Configure GitHub Repository Secrets

In your GitHub repository:
1. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following 5 secrets:

| Secret Name | Value Description | Example / Note |
| :--- | :--- | :--- |
| `EC2_HOST` | Your EC2 Public IPv4 Address | `13.232.45.120` |
| `EC2_USER` | EC2 SSH Username | `ubuntu` |
| `EC2_SSH_KEY` | Entire content of `homevault-ec2-key.pem` | Open `.pem` in TextEdit/Notepad and paste all lines including `-----BEGIN RSA PRIVATE KEY-----` |
| `MONGODB_URI` | Your MongoDB Atlas connection string | `mongodb+srv://...` (from `backend/.env`) |
| `JWT_ACCESS_SECRET` | Secret key for JWT access token | Minimum 32 characters |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh token | Minimum 32 characters |

---

## 🚀 Step 4: Push to GitHub & Trigger CI/CD

Initialize git, commit your changes, and push to your GitHub repository:

```bash
git init
git add .
git commit -m "feat: setup production Docker & AWS EC2 free tier CI/CD pipeline"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

### What Happens Automatically:
1. **GitHub Actions** runs automated tests in an isolated MongoDB container.
2. Builds the multi-stage production Docker image and publishes it to GitHub Container Registry.
3. Securely SSHs into your EC2 instance, writes environment secrets, pulls the container, and starts it.
4. Performs an automated health check against `http://localhost:5001/health` to confirm the backend is UP.

---

## 🩺 Step 5: Verify Your Production API

Visit your browser or run in terminal:
```bash
curl http://<YOUR_EC2_PUBLIC_IP>:5001/health
```

Expected Response:
```json
{
  "status": "UP",
  "timestamp": "2026-10-29T...",
  "service": "HomeVault API",
  "version": "1.0.0",
  "database": {
    "status": "CONNECTED",
    "databaseName": "HOME-MEMORY"
  }
}
```

---

## 📱 Step 6: Connect Mobile App to AWS Production Backend

In `frontend/src/services/api.ts`:
Update `PROD_BACKEND_URL`:
```typescript
export const PROD_BACKEND_URL = 'http://<YOUR_EC2_PUBLIC_IP>:5001/api/v1';
```

Now any Android device installing your APK will communicate directly with your AWS cloud backend!

