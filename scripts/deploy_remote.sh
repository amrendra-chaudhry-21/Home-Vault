#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$HOME/homevault"
echo "🚀 Deploying to ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

# 1. Write production .env file
cat > .env << ENV_VARS
NODE_ENV=production
PORT=5001
MONGODB_URI=${MONGODB_URI}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CORS_ORIGINS=*
UPLOAD_STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=public/uploads
TZ=Asia/Kolkata
IMAGE_NAME=${IMAGE_NAME}
ENV_VARS

# 2. Authenticate Docker on EC2 to pull from GHCR
echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

# 3. Write production docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_VARS'
version: '3.8'
services:
  backend:
    image: ${IMAGE_NAME}
    container_name: homevault-backend
    restart: unless-stopped
    ports:
      - "5001:5001"
    env_file:
      - .env
    volumes:
      - homevault_uploads:/app/public/uploads
    deploy:
      resources:
        limits:
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"
volumes:
  homevault_uploads:
    name: homevault_uploads
COMPOSE_VARS

# 4. Pull latest Docker image & restart container
echo "📥 Pulling latest Docker image: ${IMAGE_NAME}..."
docker compose pull backend

echo "🔄 Restarting container..."
docker compose up -d --remove-orphans

# 5. Clean up dangling images to preserve 20GB disk
docker image prune -f

# 6. Verify Healthcheck endpoint
echo "🩺 Verifying Health Check at http://localhost:5001/health..."
sleep 8
HEALTHY=0
for attempt in 1 2 3 4 5 6 7 8; do
  if curl -sf http://localhost:5001/health | grep -q '"status":"UP"'; then
    echo "=========================================================="
    echo "🎉 SUCCESS: HomeVault Backend is UP & HEALTHY on AWS EC2!"
    echo "=========================================================="
    HEALTHY=1
    break
  fi
  echo "Waiting for backend service to become ready... (Attempt $attempt/8)"
  sleep 3
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "❌ ERROR: Health check failed or timed out!"
  docker logs homevault-backend --tail 50
  exit 1
fi

