# SynapCity Backend Deployment Guide

This guide will help you deploy the SynapCity backend to Google Cloud Run with enhanced security features.

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Account**: Sign up for a free Google Cloud account
2. **Google Cloud SDK**: Install the Google Cloud CLI
3. **Docker**: Ensure Docker is installed locally
4. **Firebase Project**: Set up a Firebase project for authentication and database

### Free Tier Benefits

Google Cloud Run offers a generous free tier:
- **2 million requests per month**
- **360,000 vCPU-seconds per month**
- **180,000 GiB-seconds of memory per month**
- **1 GB network egress per month**

## 🔒 Security Enhancements

The Dockerfile includes several security improvements:

### 1. Multi-stage Build
- Reduces final image size
- Excludes build tools from production image
- Minimizes attack surface

### 2. Non-root User
- Application runs as `appuser` instead of root
- Reduces privilege escalation risks
- Follows security best practices

### 3. Minimal Base Image
- Uses `python:3.11-slim` for smaller attack surface
- Only installs necessary runtime dependencies
- Removes package lists after installation

### 4. Health Checks
- Built-in health monitoring
- Automatic container restart on failure
- Better reliability and monitoring

### 5. Proper File Permissions
- Secure file ownership
- Minimal required permissions
- Protected sensitive directories

## 📋 Deployment Steps

### Step 1: Set Up Google Cloud Project

```bash
# Install Google Cloud SDK (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create synapcity-backend --name="SynapCity Backend"

# Set the project as default
gcloud config set project synapcity-backend

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp env.template .env
   ```

2. Update the `.env` file with your actual values:
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `SECRET_KEY`: Generate a strong secret key
   - `BACKEND_CORS_ORIGINS`: Your frontend URLs
   - Other API keys as needed

3. For production, set these in Google Cloud Run console instead of using `.env`

### Step 3: Set Up Firebase Credentials

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Save the JSON file as `credentials/serviceAccountKey.json`
4. Update `GOOGLE_APPLICATION_CREDENTIALS` in environment variables

### Step 4: Deploy to Cloud Run

#### Option A: Using the Deployment Script (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

#### Option B: Manual Deployment

```bash
# Build and push the image
gcloud builds submit --tag gcr.io/$PROJECT_ID/synapcity-backend .

# Deploy to Cloud Run
gcloud run deploy synapcity-backend \
    --image gcr.io/$PROJECT_ID/synapcity-backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8000 \
    --set-env-vars DEBUG=False
```

### Step 5: Configure Environment Variables in Cloud Run

1. Go to Google Cloud Console → Cloud Run
2. Select your service
3. Go to "Edit & Deploy New Revision"
4. Add environment variables:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   SECRET_KEY=your-secret-key
   DEBUG=False
   BACKEND_CORS_ORIGINS=https://your-frontend.com
   ```

### Step 6: Set Up Firebase Credentials

1. In Cloud Run console, go to "Edit & Deploy New Revision"
2. Add a new environment variable:
   - Key: `GOOGLE_APPLICATION_CREDENTIALS`
   - Value: `/app/credentials/serviceAccountKey.json`
3. Upload your Firebase service account JSON file

## 🔧 Configuration Options

### Memory and CPU
- **Free tier**: 512Mi memory, 1 CPU
- **Production**: Adjust based on your needs

### Scaling
- **Min instances**: 0 (free tier) or 1 (production)
- **Max instances**: 10 (free tier) or higher for production

### Regions
- **Free tier**: us-central1, us-east1, europe-west1
- **Production**: Choose closest to your users

## 📊 Monitoring and Logging

### Health Checks
- Endpoint: `/health`
- Automatic monitoring by Cloud Run
- Logs available in Google Cloud Console

### API Documentation
- Swagger UI: `https://your-service-url/docs`
- ReDoc: `https://your-service-url/redoc`

## 🔐 Security Best Practices

### 1. Environment Variables
- Never commit secrets to version control
- Use Google Cloud Secret Manager for sensitive data
- Rotate secrets regularly

### 2. CORS Configuration
- Only allow necessary origins
- Avoid using `*` in production
- Update when frontend URL changes

### 3. Firebase Security
- Use Firebase App Check
- Configure proper security rules
- Monitor authentication logs

### 4. API Security
- Implement rate limiting
- Use HTTPS only
- Validate all inputs

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log [BUILD_ID]
   ```

2. **Runtime Errors**
   ```bash
   # Check service logs
   gcloud logs read --service=synapcity-backend
   ```

3. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify JSON format for credentials

4. **Firebase Connection**
   - Verify service account permissions
   - Check project ID matches
   - Ensure credentials file is uploaded

### Debug Mode
For local debugging:
```bash
# Run locally with Docker
docker build -t synapcity-backend .
docker run -p 8000:8000 synapcity-backend

# Or run directly with Python
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📈 Cost Optimization

### Free Tier Limits
- Monitor usage in Google Cloud Console
- Set up billing alerts
- Use Cloud Run's automatic scaling

### Production Considerations
- Consider reserved instances for consistent traffic
- Use Cloud CDN for static content
- Implement caching strategies

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: google-github-actions/setup-gcloud@v0
    - run: gcloud builds submit --tag gcr.io/${{ secrets.PROJECT_ID }}/synapcity-backend .
    - run: gcloud run deploy synapcity-backend --image gcr.io/${{ secrets.PROJECT_ID }}/synapcity-backend --region us-central1 --platform managed --allow-unauthenticated
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Google Cloud Run documentation
3. Check the API documentation at `/docs`
4. Monitor logs in Google Cloud Console

## 🎉 Success!

Once deployed, your API will be available at:
- **Service URL**: `https://synapcity-backend-[hash]-uc.a.run.app`
- **Health Check**: `https://synapcity-backend-[hash]-uc.a.run.app/health`
- **API Docs**: `https://synapcity-backend-[hash]-uc.a.run.app/docs` 