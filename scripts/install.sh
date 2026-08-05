#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "       Installing Mirror CLI & Antigravity Skill          "
echo "=========================================================="

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js (https://nodejs.org) and try again."
    exit 1
fi

INSTALL_PATH="$HOME/.mirror-cli"

if [ ! -d "$INSTALL_PATH" ]; then
    echo "[1/2] Cloning repository to $INSTALL_PATH..."
    git clone https://github.com/AbdulllrahmanDev/Mirror-CLI.git "$INSTALL_PATH"
else
    echo "[1/2] Updating repository at $INSTALL_PATH..."
    cd "$INSTALL_PATH"
    git pull
fi

cd "$INSTALL_PATH"
npm install
npm link --force

echo "[2/2] Registering Mirror Skill in Antigravity IDE..."
node scripts/install-skill.js

echo "=========================================================="
echo " SUCCESS: Mirror CLI & Skill installed successfully!"
echo " You can now run 'mirror <URL>' or '/Mirror' in Antigravity."
echo "=========================================================="
