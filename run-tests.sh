#!/bin/bash

# Fairbeam Test Runner Script
# Run all unit tests for the FHE Lending Platform

set -e  # Exit on error

echo "🧪 Fairbeam Test Suite"
echo "======================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "contracts" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

# Navigate to contracts directory
cd contracts

echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo -e "${YELLOW}🔧 Compiling contracts...${NC}"
npx hardhat compile

echo ""
echo -e "${GREEN}🚀 Running tests...${NC}"
echo ""

# Check if specific test file is provided as argument
if [ $# -eq 1 ]; then
    TEST_FILE=$1
    echo "Running specific test: $TEST_FILE"
    npx hardhat test ../tests/$TEST_FILE
else
    echo "Running all tests..."
    npx hardhat test ../tests/*.test.js
fi

echo ""
echo -e "${GREEN}✅ Tests completed!${NC}"
