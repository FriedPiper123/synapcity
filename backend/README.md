# SynapCity Backend

A FastAPI-based backend service for the SynapCity application, providing APIs for user management, neighborhood discussions, and area insights.

## Features

- User authentication and profile management
- Create and manage posts (alerts, discussions, questions)
- Upvote/downvote posts
- Comment on posts
- Get neighborhood insights and statistics
- Real-time updates using Firebase Firestore

## Prerequisites

- Python 3.8+
- Firebase project with Firestore and Authentication enabled
- Firebase Admin SDK credentials file
- Google Cloud Storage bucket (for file uploads)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/synapcity-backend.git
   cd synapcity-backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```env
   # Firebase Configuration
   FIREBASE_CREDENTIALS_PATH=path/to/your/firebase-credentials.json
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
   
   # JWT Configuration
   SECRET_KEY=your-secret-key
   
   # App Configuration
   DEBUG=True
   ```

## Running the Application

1. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. The API will be available at `http://localhost:8000`

3. Access the interactive API documentation at:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## Running Tests

To run the test suite:

```bash
pytest
```

## API Endpoints

### Authentication
- All endpoints except `/health` and `/docs` require authentication
- Include the Firebase ID token in the `Authorization` header:
  ```
  Authorization: Bearer <firebase_id_token>
  ```

### Available Endpoints

#### Users
- `POST /api/v1/users/` - Create a new user profile
- `GET /api/v1/users/me` - Get current user's profile
- `PATCH /api/v1/users/me` - Update current user's profile
- `GET /api/v1/users/{user_id}` - Get user by ID

#### Posts
- `POST /api/v1/posts/` - Create a new post
- `GET /api/v1/posts/neighborhood/{neighborhood}` - Get posts for a neighborhood
- `POST /api/v1/posts/{post_id}/upvote` - Upvote a post
- `POST /api/v1/posts/{post_id}/downvote` - Downvote a post
- `POST /api/v1/posts/{post_id}/comments` - Add a comment to a post
- `GET /api/v1/posts/{post_id}/comments` - Get comments for a post

#### Areas
- `GET /api/v1/areas/{area_name}` - Get area statistics and trends

## Project Structure

```
synapcity-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application setup
│   ├── config.py            # Application configuration
│   ├── database.py          # Firebase database operations
│   ├── auth.py              # Authentication services
│   ├── middleware.py        # Request/response middleware
│   ├── exceptions.py        # Custom exceptions
│   ├── dependencies.py      # Dependency injection
│   │
│   ├── models/              # Pydantic models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── post.py
│   │   └── area.py
│   │
│   └── routers/             # API route handlers
│       ├── __init__.py
│       ├── users.py
│       ├── posts.py
│       └── areas.py
│
├── tests/                   # Test files
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_users.py
│   ├── test_posts.py
│   └── test_areas.py
│
├── .env.example             # Example environment variables
├── requirements.txt         # Python dependencies
└── README.md
```

## Deployment

### Production
For production deployment, consider using:
- GCP Cloud Run
- AWS Elastic Beanstalk
- Heroku
- Docker + Kubernetes

### Environment Variables
Make sure to set appropriate environment variables in your production environment, especially:
- `FIREBASE_CREDENTIALS_PATH`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `SECRET_KEY`
- `DEBUG=False`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
