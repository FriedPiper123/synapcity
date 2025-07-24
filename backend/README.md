# SynapCity Backend

A hyperlocal social network API built with FastAPI and Firebase.

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- Firebase project with Firestore enabled
- Firebase service account key

### 1. Environment Setup

```bash
# Clone and navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your Firebase configuration
# Make sure to set:
# - FIREBASE_PROJECT_ID=your-project-id
# - FIREBASE_STORAGE_BUCKET=your-storage-bucket
# - GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file and save it as `credentials/serviceAccountKey.json`

### 4. Verify Setup

```bash
# Run setup verification script
python setup_firebase.py
```

### 5. Start the Server

```bash
# Development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

Once the server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

## 🔐 Authentication

The API uses Firebase Authentication with ID tokens. Include the token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Key Endpoints:
- `POST /api/v1/auth/verify` - Verify Firebase token
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/test-token` - Test token validity

## 📋 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /verify` - Verify Firebase token
- `GET /me` - Get current user profile
- `POST /test-token` - Test token validity
- `POST /refresh` - Refresh token (placeholder)
- `POST /logout` - Logout (placeholder)

### Users (`/api/v1/users`)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `GET /{user_id}` - Get user by ID
- `POST /subscribe-area/{area_id}` - Subscribe to area
- `DELETE /unsubscribe-area/{area_id}` - Unsubscribe from area

### Posts (`/api/v1/posts`)
- `POST /` - Create new post
- `GET /` - Get posts (with filtering)
- `GET /{post_id}` - Get specific post
- `PUT /{post_id}` - Update post
- `DELETE /{post_id}` - Delete post
- `POST /{post_id}/like` - Like/unlike post

### Comments (`/api/v1/comments`)
- `POST /` - Create new comment
- `GET /post/{post_id}` - Get comments for post
- `GET /{comment_id}` - Get specific comment
- `PUT /{comment_id}` - Update comment
- `DELETE /{comment_id}` - Delete comment

### Areas (`/api/v1/areas`)
- `POST /` - Create new area
- `GET /` - Get areas (with filtering)
- `POST /nearby` - Get nearby areas
- `GET /{area_id}` - Get specific area
- `PUT /{area_id}` - Update area
- `DELETE /{area_id}` - Delete area
- `GET /{area_id}/stats` - Get area statistics

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Configuration settings
│   │   ├── firebase.py      # Firebase initialization
│   │   └── security.py      # Authentication & security
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py          # User data models
│   │   ├── post.py          # Post data models
│   │   ├── comment.py       # Comment data models
│   │   └── area.py          # Area data models
│   └── api/
│       ├── __init__.py
│       ├── deps.py          # API dependencies
│       └── v1/
│           ├── __init__.py
│           ├── auth.py      # Authentication routes
│           ├── users.py     # User routes
│           ├── posts.py     # Post routes
│           ├── comments.py  # Comment routes
│           └── areas.py     # Area routes
├── credentials/
│   └── serviceAccountKey.json
├── .env                     # Environment variables
├── .env.example            # Environment template
├── .gitignore
├── requirements.txt        # Python dependencies
├── setup_firebase.py       # Setup verification script
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | `synapcity-90985` |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `synapcity-90985.firebasestorage.app` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | `./credentials/serviceAccountKey.json` |
| `SECRET_KEY` | JWT secret key | `your-secret-key` |
| `DEBUG` | Debug mode | `True` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:8000` |

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Test Authentication
```bash
curl -X POST "http://localhost:8000/api/v1/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{"firebase_token": "your-firebase-token"}'
```

### Test with Bearer Token
```bash
curl -H "Authorization: Bearer your-firebase-token" \
  http://localhost:8000/api/v1/auth/me
```

## 🚨 Troubleshooting

### Common Issues

1. **Firebase credentials not found**
   - Ensure `serviceAccountKey.json` exists in `credentials/` folder
   - Check `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

2. **Port already in use**
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

3. **CORS errors**
   - Add your frontend URL to `BACKEND_CORS_ORIGINS` in `.env`

4. **Module not found errors**
   - Ensure virtual environment is activated
   - Install dependencies: `pip install -r requirements.txt`

### Debug Mode

Set `DEBUG=True` in `.env` for detailed error messages and auto-reload.

## 📦 Dependencies

- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Firebase Admin**: Firebase integration
- **Pydantic**: Data validation
- **Python-JOSE**: JWT handling
- **HTTPx**: HTTP client for Firebase REST API
- **Cryptography**: Certificate handling

## 🔒 Security Features

- Firebase ID token verification
- JWT token validation with fallback
- CORS protection
- Input validation with Pydantic
- Secure credential handling

## 🚀 Deployment

### Production Checklist

1. Set `DEBUG=False` in production
2. Use strong `SECRET_KEY`
3. Configure proper CORS origins
4. Set up HTTPS
5. Use environment variables for secrets
6. Enable Firebase App Check
7. Set up monitoring and logging

### Docker Deployment (Optional)

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📈 Monitoring

The API includes several monitoring endpoints:

- `GET /health` - Basic health check
- `GET /api/v1/status` - Detailed status with Firebase connectivity
- `GET /version` - API version information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at `/docs`
3. Run the setup verification script: `python setup_firebase.py`
