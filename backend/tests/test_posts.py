import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import status
from app.models import Post, PostCreate, CommentCreate
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_create_post_success(client, mock_firebase_service, sample_user, auth_headers):
    # Setup
    test_post = PostCreate(
        text="Test post content",
        type="discussion",
        category="general",
        neighborhood="Test Area"
    )
    
    # Mock the create_post method
    created_post = test_post.dict()
    created_post.update({
        "postId": "post123",
        "authorId": sample_user.userId,
        "upvotes": 0,
        "downvotes": 0,
        "commentCount": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    })
    mock_firebase_service.create_post = AsyncMock(return_value=created_post)
    
    # Test
    response = client.post(
        "/api/v1/posts/",
        json=test_post.dict(),
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["text"] == "Test post content"
    assert response.json()["authorId"] == sample_user.userId

@pytest.mark.asyncio
async def test_get_feed_for_neighborhood(client, mock_firebase_service, sample_post):
    # Setup
    mock_firebase_service.get_posts_by_neighborhood = AsyncMock(return_value=[sample_post.dict()])
    
    # Test
    response = client.get("/api/v1/posts/neighborhood/Test%20Area?limit=10")
    
    # Assert
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 1
    assert response.json()[0]["neighborhood"] == "Test Area"

@pytest.mark.asyncio
async def test_upvote_post_success(client, mock_firebase_service, sample_post, auth_headers):
    # Setup
    mock_firebase_service.update_post_votes = AsyncMock(return_value=True)
    
    # Test
    response = client.post(
        f"/api/v1/posts/{sample_post.postId}/upvote",
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_204_NO_CONTENT

@pytest.mark.asyncio
async def test_create_comment_success(client, mock_firebase_service, sample_post, auth_headers):
    # Setup
    test_comment = CommentCreate(text="Test comment")
    created_comment = {
        "commentId": "comment123",
        "authorId": "test123",
        "text": "Test comment",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    mock_firebase_service.create_comment = AsyncMock(return_value=created_comment)
    
    # Test
    response = client.post(
        f"/api/v1/posts/{sample_post.postId}/comments",
        json=test_comment.dict(),
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["text"] == "Test comment"
    assert "commentId" in response.json()
