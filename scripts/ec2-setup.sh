#!/usr/bin/env bash
# ==============================================================================
# HomeVault AWS EC2 (t2.micro Free Tier) 1-Click Provisioning Script
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🚀 Starting HomeVault EC2 Free Tier Server Setup..."
echo "=========================================================="

# 1. Update OS packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git jq ca-certificates gnupg lsb-release ufw

# 2. Configure 2GB Swap Memory (Prevents OOM crashes on t2.micro 1GB RAM)
if [ ! -f /swapfile ]; then
    echo "🧠 Creating 2GB Swap Memory..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    echo "✅ 2GB Swap Space successfully enabled."
else
    echo "ℹ️ Swap file already exists. Skipping swap creation."
fi

# 3. Install Docker Engine and Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl restart docker
    echo "✅ Docker installed successfully."
else
    echo "ℹ️ Docker is already installed."
fi

# 4. Prepare Application Directory
DEPLOY_DIR="/home/$USER/homevault"
echo "📁 Setting up deployment directory at ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}/uploads"

# 5. Summary & Next Steps
echo "=========================================================="
echo "🎉 EC2 Free Tier Server Setup Complete!"
echo "=========================================================="
echo "Docker version: $(docker --version 2>/dev/null || echo 'Re-login required')"
echo "Compose version: $(docker compose version 2>/dev/null || echo 'Re-login required')"
echo ""
echo "👉 NOTE: Please log out and log back in (or run 'newgrp docker')"
echo "   for non-root docker permissions to take effect."
echo "=========================================================="

