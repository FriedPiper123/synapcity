# SynapCity - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup Instructions](#setup-instructions)
5. [API Documentation](#api-documentation)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Project Overview
SynapCity is a real-time traffic and route optimization platform that provides intelligent route suggestions based on various factors including traffic conditions, weather, and road incidents.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: MongoDB (via Motor for async support)
- **Authentication**: Firebase Authentication
- **Testing**: Pytest with AsyncClient
- **API Documentation**: OpenAPI/Swagger
- **Containerization**: Docker

### Frontend
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **Maps**: React Native Maps
- **UI**: React Native Paper

## Project Structure

```
synapcity/
├── backend/                    # Backend server code
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   └── v1/            # API version 1
│   │   │       ├── __init__.py
│   │   │       ├── auth.py     # Authentication endpoints
│   │   │       ├── routes.py   # Route optimization endpoints
│   │   │       └── ...
│   │   ├── core/              # Core functionality
│   │   ├── models/            # Database models
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Backend tests
│   ├── requirements.txt        # Python dependencies
│   └── main.py                # Application entry point
│
├── frontend/                  # Mobile app code
│   ├── src/
│   │   ├── api/              # API clients
│   │   ├── components/        # Reusable components
│   │   ├── navigation/       # Navigation setup
│   │   ├── screens/          # App screens
│   │   └── store/            # State management
│   ├── App.js                # App entry point
│   └── app.json              # Expo configuration
│
├── docs/                     # Documentation
└── docker-compose.yml        # Docker setup
```

## Setup Instructions

### Backend Setup
1. Clone the repository
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. Set up environment variables (copy .env.example to .env and update values)
5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Install Node.js and npm
2. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```
3. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. Start the development server:
   ```bash
   expo start
   ```

## API Documentation

### Authentication
All API endpoints (except `/auth/*`) require an `Authorization` header with a Firebase ID token:
```
Authorization: Bearer <firebase-id-token>
```

### Key Endpoints

#### 1. Get Best Route
- **Endpoint**: `POST /api/v1/routes/best-route`
- **Request Body**:
  ```json
  {
    "origin": "Location name or coordinates",
    "destination": "Location name or coordinates",
    "departure_time": 1753317000000  // Optional, Unix timestamp in milliseconds
  }
  ```
- **Response**:
  ```json
  {
    "routes": [
      {
        "route_id": 0,
        "summary": "Summary of the best route",
        "duration": 1800,
        "distance": 5000,
        "groups": [
          {
            "group_id": "group_0",
            "status": "blocked",
            "recommendation": "avoid",
            "summary": "Route blocked due to accident",
            "accident": ["3-car collision near Silk Board junction"],
            "construction": ["Ongoing Metro Construction"],
            "weather": {"impact": "low", "conditions": "clear"},
            "traffic": {"level": "heavy", "delay_minutes": 45}
          }
        ]
      }
    ]
  }
  ```

## Development Workflow

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and write tests
3. Run tests:
   ```bash
   # Backend tests
   cd backend
   PYTHONPATH=. pytest
   
   # Frontend tests
   cd ../frontend
   npm test
   ```
4. Commit changes with a descriptive message
5. Push to your branch and create a pull request

## Testing

### Backend Tests
```bash
cd backend
PYTHONPATH=. pytest -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Backend
1. Build Docker image:
   ```bash
   docker build -t synapcity-backend -f backend/Dockerfile .
   ```
2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Frontend
1. Build for production:
   ```bash
   expo build:android  # or expo build:ios
   ```
2. Deploy to app stores using Expo's deployment tools

## Troubleshooting

### Common Issues

#### Firebase Authentication Errors
- Ensure Firebase config is correctly set in environment variables
- Verify Firebase Admin SDK credentials are properly configured

#### Database Connection Issues
- Check if MongoDB is running
- Verify connection string in environment variables

#### Frontend Build Failures
- Clear Expo cache: `expo start -c`
- Reinstall node modules: `rm -rf node_modules && npm install`

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License
[Specify your license here]

## Contact
[Your contact information]
