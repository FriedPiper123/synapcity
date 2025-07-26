#!/bin/bash

# Configuration
PROJECT_ID="fastpiper-ca012"  # Your existing Firebase project
SERVICE_NAME="synapcity-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting SynapCity Backend Deployment${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Authenticate with Google Cloud
echo -e "${YELLOW}🔐 Authenticating with Google Cloud...${NC}"
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}⚡ Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create secrets in Secret Manager for sensitive data
echo -e "${YELLOW}🔒 Creating secrets in Secret Manager...${NC}"

# Create SECRET_KEY secret
echo -n "m5P9N73PGjmkWD6qmbviDaXiNv1sIPzdtQ3lPieEIJ4" | gcloud secrets create secret-key --data-file=- --quiet || echo "Secret 'secret-key' already exists"

# Create GEMINI_API_KEY secret
echo -n "AIzaSyBH4hrmqBScRCd5fISKocBWlUzFFrzqndc" | gcloud secrets create gemini-api-key --data-file=- --quiet || echo "Secret 'gemini-api-key' already exists"

# Create GOOGLE_MAPS_API_KEY secret
echo -n "AIzaSyAsaVZQ92vQcr_NQTeSt2Silg0oR7ZN2gU" | gcloud secrets create google-maps-api-key --data-file=- --quiet || echo "Secret 'google-maps-api-key' already exists"

# Create Firebase service account key secret
gcloud secrets create firebase-service-key --data-file=credentials/serviceAccountKey.json --quiet || echo "Secret 'firebase-service-key' already exists"

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}🐳 Configuring Docker...${NC}"
gcloud auth configure-docker --quiet

# Build the Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Push the image to Google Container Registry
echo -e "${YELLOW}📤 Pushing image to Google Container Registry...${NC}"
docker push $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker push failed${NC}"
    exit 1
fi

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 80 \
    --set-env-vars="FIREBASE_PROJECT_ID=fastpiper-ca012" \
    --set-env-vars="FIREBASE_STORAGE_BUCKET=fastpiper-ca012.firebasestorage.app" \
    --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/serviceAccountKey.json" \
    --set-env-vars="API_V1_STR=/api/v1" \
    --set-env-vars="PROJECT_NAME=SynapCity" \
    --set-env-vars="DEBUG=False" \
    --set-env-vars="PORT=8080" \
    --set-env-vars="FS_CREDENTIAL_JSON=/app/credentials/serviceAccountKey.json" \
    --set-env-vars="BACKEND_CORS_ORIGINS=https://your-frontend-domain.com,https://your-app-domain.com" \
    --set-secrets="SECRET_KEY=secret-key:latest" \
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
    --set-secrets="GOOGLE_MAPS_API_KEY=google-maps-api-key:latest"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Your API is now live. Check the service URL above.${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Test your API endpoints"
    echo "2. Update CORS origins with your actual frontend domain"
    echo "3. Set up custom domain if needed"
    echo "4. Configure monitoring and logging"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
