#!/bin/bash
# codebase-pilot installer
# Usage: curl -fsSL https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/install.sh | bash

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}codebase-pilot${NC} installer"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required (>= 18.0.0)${NC}"
    echo ""
    echo "Install Node.js:"
    echo "  macOS:   brew install node"
    echo "  Linux:   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  Windows: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js >= 18 required (found v$(node -v))${NC}"
    exit 1
fi

echo -e "  Node.js: ${GREEN}$(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is required${NC}"
    exit 1
fi

echo -e "  npm:     ${GREEN}$(npm -v)${NC}"
echo ""

# Install
echo -e "  Installing codebase-pilot..."
npm install -g codebase-pilot-cli

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo -e "  ${BOLD}Quick start:${NC}"
echo "    codebase-pilot init             # scan project"
echo "    codebase-pilot pack --compress  # pack for AI"
echo "    codebase-pilot ui               # dashboard → http://localhost:7456"
echo ""
echo -e "  Docs: ${BLUE}https://github.com/kalpeshgamit/codebase-pilot${NC}"
echo ""
