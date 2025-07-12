import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import create_application
from app.database import firebase_service
from app.models import User, Post, Comment
from datetime import datetime

@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def mock_firebase_service():
    with patch('app.database.firebase_service') as mock:
        yield mock

@pytest.fixture
def sample_user():
    return User(
        userId="test123",
        username="testuser",
        profileImageUrl="http://example.com/avatar.jpg",
        subscribedAreas=["Area1", "Area2"],
        createdAt=datetime.utcnow()
    )

@pytest.fixture
def sample_post():
    return Post(
        postId="post123",
        authorId="test123",
        text="Test post content",
        type="discussion",
        category="general",
        neighborhood="Test Area",
        upvotes=0,
        downvotes=0,
        commentCount=0,
        createdAt=datetime.utcnow(),
        status="active"
    )

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test_token"}
