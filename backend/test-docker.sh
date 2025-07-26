#!/bin/bash

# Test Docker Build Script
# This script tests the Docker build locally

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Testing Docker Build${NC}"
echo "=========================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is available${NC}"

# Build the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t synapcity-backend-test .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker build successful!${NC}"
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

# Test the container
echo -e "${YELLOW}🧪 Testing container...${NC}"
docker run -d --name synapcity-test -p 8000:8000 synapcity-backend-test

# Wait for the container to start
sleep 5

# Test health endpoint
echo -e "${YELLOW}🏥 Testing health endpoint...${NC}"
if curl -f http://localhost:8000/health &> /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
fi

# Test root endpoint
echo -e "${YELLOW}🌐 Testing root endpoint...${NC}"
if curl -f http://localhost:8000/ &> /dev/null; then
    echo -e "${GREEN}✅ Root endpoint working!${NC}"
else
    echo -e "${RED}❌ Root endpoint failed!${NC}"
fi

# Clean up
echo -e "${YELLOW}🧹 Cleaning up test container...${NC}"
docker stop synapcity-test
docker rm synapcity-test

echo -e "${GREEN}✅ Docker test completed successfully!${NC}"
echo -e "${GREEN}🚀 Ready for deployment to Google Cloud Run${NC}" 