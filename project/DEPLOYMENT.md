# SynapCity Frontend - Google Cloud Run Deployment Guide

This guide will help you deploy the SynapCity React frontend to Google Cloud Run.

## Prerequisites

1. **Google Cloud Project**: You need an active Google Cloud Project
2. **Google Cloud CLI**: Install and configure `gcloud` CLI
3. **Docker**: Docker must be installed and running
4. **Billing**: Enable billing on your Google Cloud Project

## Quick Setup

### 1. Install Google Cloud CLI

```bash
# Install gcloud CLI (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### 2. Authenticate and Set Project

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Use the deployment script for a streamlined deployment:

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy (replace with your project ID)
./deploy.sh your-project-id asia-south1
```

### Method 2: Manual Step-by-Step Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/synapcity-frontend:latest .
   ```

2. **Push to Container Registry:**
   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/synapcity-frontend:latest
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy synapcity-frontend \
     --image gcr.io/YOUR_PROJECT_ID/synapcity-frontend:latest \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --max-instances 100
   ```

### Method 3: Using Cloud Build (CI/CD)

1. **Connect your repository to Cloud Build**
2. **Configure the trigger** to use `cloudbuild.yaml`
3. **Push to your repository** to trigger automatic deployment

### Method 4: Declarative Deployment

Use the service configuration file:

```bash
# Update PROJECT_ID in service.yaml first
sed -i 's/PROJECT_ID/your-actual-project-id/g' service.yaml

# Deploy using the service configuration
gcloud run services replace service.yaml --region=asia-south1
```

## Environment Variables

### Required Environment Variables

The application may require these environment variables in production:

```bash
# Set environment variables during deployment
gcloud run services update synapcity-frontend \
  --set-env-vars NODE_ENV=production \
  --set-env-vars REACT_APP_API_URL=https://your-backend-url.com \
  --set-env-vars REACT_APP_FIREBASE_API_KEY=your-firebase-key \
  --region asia-south1
```

### Common Environment Variables for React Apps:

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_FIREBASE_API_KEY`: Firebase configuration
- `REACT_APP_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `REACT_APP_FIREBASE_PROJECT_ID`: Firebase project ID
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Google Maps API key

## Configuration Options

### Resource Limits

You can adjust resources based on your needs:

```bash
gcloud run services update synapcity-frontend \
  --memory 1Gi \
  --cpu 2 \
  --max-instances 200 \
  --region asia-south1
```

### Custom Domain

To use a custom domain:

1. **Verify domain ownership** in Google Cloud Console
2. **Map the domain:**
   ```bash
   gcloud run domain-mappings create \
     --service synapcity-frontend \
     --domain your-domain.com \
     --region asia-south1
   ```

## Monitoring and Logs

### View Logs
```bash
gcloud run logs tail synapcity-frontend --region=asia-south1
```

### Monitor Performance
- Visit [Google Cloud Console](https://console.cloud.google.com/run)
- Navigate to your service for metrics and monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Docker is running
   - Verify all dependencies in package.json
   - Check for TypeScript errors

2. **Memory Issues**
   - Increase memory limit: `--memory 1Gi`
   - Optimize bundle size with `npm run build`

3. **Startup Issues**
   - Check health check endpoint `/_health`
   - Verify port 8080 is correctly exposed
   - Check nginx configuration

4. **Environment Variables**
   - Ensure all required REACT_APP_ variables are set
   - Verify Firebase configuration is correct

### Health Check

The application includes a health check endpoint at `/_health` that returns "healthy" when the service is running properly.

## Cost Optimization

- **Use minimum instances**: Set to 0 for development
- **Right-size resources**: Start with 512Mi memory, 1 CPU
- **Monitor usage**: Use Cloud Monitoring to track costs

## Security Considerations

- **Container Registry**: Images are stored in your private registry
- **IAM**: Use least-privilege access for service accounts
- **HTTPS**: Cloud Run provides automatic HTTPS termination
- **Headers**: Security headers are configured in nginx.conf

## Next Steps

After deployment:

1. Test your application thoroughly
2. Set up monitoring and alerting
3. Configure your custom domain (if needed)
4. Set up CI/CD pipeline for automatic deployments
5. Configure your backend API endpoints
6. Update Firebase configuration for production

Your React application should now be successfully deployed to Google Cloud Run! 