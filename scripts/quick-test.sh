#!/bin/bash

# Quick Testing Script for Local Blockchain Forks
# This script helps you quickly set up and test your staking application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   Perpetual Pools - Local Testing Setup       ║"
echo "╔════════════════════════════════════════════════╗"
echo -e "${NC}"

# Function to check if a process is running on a port
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠️  Port $1 is in use. Killing existing process...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Parse command line arguments
NETWORK=${1:-ethereum}  # Default to ethereum
DAYS=${2:-1}           # Default to 1 day
ACTION=${3:-status}    # Default to status

# Validate network
if [[ "$NETWORK" != "ethereum" && "$NETWORK" != "pulsechain" ]]; then
    echo -e "${RED}❌ Invalid network. Use 'ethereum' or 'pulsechain'${NC}"
    echo "Usage: ./scripts/quick-test.sh [ethereum|pulsechain] [days] [action]"
    echo "Example: ./scripts/quick-test.sh ethereum 30 forward"
    exit 1
fi

# Determine port based on network
if [ "$NETWORK" == "ethereum" ]; then
    PORT=8545
    CHAIN_ID=1
    RPC_URL=${ETHEREUM_RPC:-https://eth.llamarpc.com}
else
    PORT=8546
    CHAIN_ID=369
    RPC_URL=${PULSECHAIN_RPC:-https://rpc.pulsechain.com}
fi

echo -e "${GREEN}🔧 Configuration:${NC}"
echo "   Network: $NETWORK"
echo "   Chain ID: $CHAIN_ID"
echo "   Port: $PORT"
echo "   RPC: $RPC_URL"
echo ""

# Check if fork is running
if ! check_port $PORT; then
    echo -e "${YELLOW}📡 Fork not running. Starting $NETWORK fork on port $PORT...${NC}"
    
    # Start the fork in the background
    if [ "$NETWORK" == "ethereum" ]; then
        npm run fork:ethereum > /tmp/hardhat-fork-eth.log 2>&1 &
    else
        npm run fork:pulsechain > /tmp/hardhat-fork-pls.log 2>&1 &
    fi
    
    FORK_PID=$!
    echo "   Fork PID: $FORK_PID"
    
    # Wait for fork to be ready
    echo -e "${YELLOW}⏳ Waiting for fork to be ready...${NC}"
    WAIT_TIME=0
    MAX_WAIT=60
    
    while ! check_port $PORT; do
        sleep 1
        WAIT_TIME=$((WAIT_TIME + 1))
        if [ $WAIT_TIME -gt $MAX_WAIT ]; then
            echo -e "${RED}❌ Fork failed to start within ${MAX_WAIT}s${NC}"
            echo "Check logs at: /tmp/hardhat-fork-${NETWORK}.log"
            exit 1
        fi
        echo -n "."
    done
    
    echo ""
    echo -e "${GREEN}✅ Fork started successfully!${NC}"
    sleep 2
else
    echo -e "${GREEN}✅ Fork is already running on port $PORT${NC}"
fi

# Perform action based on argument
if [ "$ACTION" == "forward" ]; then
    echo ""
    echo -e "${BLUE}⏩ Fast forwarding time by $DAYS days...${NC}"
    npm run time:forward $DAYS
elif [ "$ACTION" == "test" ]; then
    echo ""
    echo -e "${BLUE}🧪 Running stake lifecycle tests...${NC}"
    npm run test:stakes
elif [ "$ACTION" == "status" ]; then
    echo ""
    echo -e "${BLUE}📊 Checking blockchain status...${NC}"
    npm run time:status
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! 🎉                ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. Configure MetaMask:"
echo "   - Network Name: Local $NETWORK"
echo "   - RPC URL: http://127.0.0.1:$PORT"
echo "   - Chain ID: $CHAIN_ID"
echo "   - Currency: ${NETWORK == 'ethereum' ? 'ETH' : 'PLS'}"
echo ""
echo "2. Start your frontend (in a new terminal):"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "3. Open your app:"
echo "   ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo ""
echo "Fast forward time:"
echo "   ${GREEN}npm run time:forward <days>${NC}"
echo "   Example: npm run time:forward 30"
echo ""
echo "Check status:"
echo "   ${GREEN}npm run time:status${NC}"
echo ""
echo "Test stakes:"
echo "   ${GREEN}npm run test:stakes${NC}"
echo "   ${GREEN}npm run test:stakes MAXI${NC}"
echo ""
echo "Stop fork:"
echo "   ${GREEN}pkill -f 'hardhat node'${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Keep this terminal open to keep the fork running!${NC}"
echo ""

