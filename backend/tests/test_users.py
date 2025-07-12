import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import status
from app.models import User, UserCreate, UserUpdate

@pytest.mark.asyncio
async def test_create_user_success(client, mock_firebase_service, auth_headers):
    # Setup
    test_user = UserCreate(
        username="testuser",
        profileImageUrl="http://example.com/avatar.jpg",
        subscribedAreas=["Area1", "Area2"]
    )
    
    # Mock the get_user_by_uid to return None (user doesn't exist)
    mock_firebase_service.get_user_by_uid = AsyncMock(return_value=None)
    
    # Mock create_user to return the created user
    user_data = test_user.dict()
    user_data["userId"] = "test123"
    mock_firebase_service.create_user = AsyncMock(return_value=user_data)
    
    # Test
    response = client.post(
        "/api/v1/users/",
        json=test_user.dict(),
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["username"] == "testuser"
    assert "userId" in response.json()

@pytest.mark.asyncio
async def test_get_current_user_success(client, mock_firebase_service, sample_user, auth_headers):
    # Setup
    mock_firebase_service.get_user_by_uid = AsyncMock(return_value=sample_user.dict())
    
    # Test
    response = client.get(
        "/api/v1/users/me",
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == sample_user.username
    assert response.json()["userId"] == sample_user.userId

@pytest.mark.asyncio
async def test_update_user_success(client, mock_firebase_service, sample_user, auth_headers):
    # Setup
    update_data = UserUpdate(
        username="updateduser",
        profileImageUrl="http://example.com/new_avatar.jpg"
    )
    
    # Mock get_user_by_uid to return the existing user
    mock_firebase_service.get_user_by_uid = AsyncMock(return_value=sample_user.dict())
    
    # Mock create_user to return the updated user
    updated_user = sample_user.dict()
    updated_user.update(update_data.dict(exclude_unset=True))
    mock_firebase_service.create_user = AsyncMock(return_value=updated_user)
    
    # Test
    response = client.patch(
        "/api/v1/users/me",
        json=update_data.dict(exclude_unset=True),
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "updateduser"
    assert response.json()["profileImageUrl"] == "http://example.com/new_avatar.jpg"
