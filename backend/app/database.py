import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Optional, Dict, Any, List
import structlog
from .config import settings

logger = structlog.get_logger()

class FirebaseService:
    def __init__(self):
        if not firebase_admin._apps:
            if settings.FIREBASE_CREDENTIALS_PATH:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            else:
                cred = credentials.ApplicationDefault()
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': settings.FIREBASE_STORAGE_BUCKET
            })
        
        self.db = firestore.client()
        self.storage_client = storage.bucket()
        logger.info("Firebase initialized successfully")
    
    async def get_user_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user document by UID"""
        try:
            doc = self.db.collection('users').document(uid).get()
            if doc.exists:
                return {"userId": doc.id, **doc.to_dict()}
            return None
        except Exception as e:
            logger.error("Error fetching user", uid=uid, error=str(e))
            raise
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user document"""
        try:
            doc_ref = self.db.collection('users').document(user_data['userId'])
            doc_ref.set(user_data)
            return user_data
        except Exception as e:
            logger.error("Error creating user", error=str(e))
            raise
    
    async def get_posts_by_neighborhood(self, neighborhood: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get posts for a specific neighborhood"""
        try:
            query = (self.db.collection('posts')
                    .where(filter=FieldFilter('neighborhood', '==', neighborhood))
                    .where(filter=FieldFilter('status', '==', 'active'))
                    .order_by('createdAt', direction=firestore.Query.DESCENDING)
                    .limit(limit))
            
            docs = query.stream()
            return [{"postId": doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error("Error fetching posts", neighborhood=neighborhood, error=str(e))
            raise
    
    async def create_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new post"""
        try:
            doc_ref = self.db.collection('posts').document()
            post_data['postId'] = doc_ref.id
            doc_ref.set(post_data)
            return post_data
        except Exception as e:
            logger.error("Error creating post", error=str(e))
            raise
    
    async def update_post_votes(self, post_id: str, user_id: str, vote_type: str) -> bool:
        """Update post votes (upvote/downvote)"""
        try:
            post_ref = self.db.collection('posts').document(post_id)
            
            @firestore.transactional
            def update_votes(transaction):
                post_doc = post_ref.get(transaction=transaction)
                if not post_doc.exists:
                    return False
                
                post_data = post_doc.to_dict()
                upvoted_by = post_data.get('upvotedBy', [])
                downvoted_by = post_data.get('downvotedBy', [])
                
                # Remove user from both arrays first
                if user_id in upvoted_by:
                    upvoted_by.remove(user_id)
                if user_id in downvoted_by:
                    downvoted_by.remove(user_id)
                
                # Add user to appropriate array
                if vote_type == 'upvote':
                    upvoted_by.append(user_id)
                elif vote_type == 'downvote':
                    downvoted_by.append(user_id)
                
                # Update the document
                transaction.update(post_ref, {
                    'upvotes': len(upvoted_by),
                    'downvotes': len(downvoted_by),
                    'upvotedBy': upvoted_by,
                    'downvotedBy': downvoted_by
                })
                return True
            
            return update_votes(self.db.transaction())
        except Exception as e:
            logger.error("Error updating votes", post_id=post_id, error=str(e))
            raise
    
    async def create_comment(self, post_id: str, comment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new comment"""
        try:
            comment_ref = self.db.collection('posts').document(post_id).collection('comments').document()
            comment_data['commentId'] = comment_ref.id
            comment_ref.set(comment_data)
            
            # Update comment count
            post_ref = self.db.collection('posts').document(post_id)
            post_ref.update({'commentCount': firestore.Increment(1)})
            
            return comment_data
        except Exception as e:
            logger.error("Error creating comment", post_id=post_id, error=str(e))
            raise
    
    async def get_comments_for_post(self, post_id: str) -> List[Dict[str, Any]]:
        """Get comments for a specific post"""
        try:
            query = (self.db.collection('posts').document(post_id)
                    .collection('comments')
                    .order_by('createdAt', direction=firestore.Query.ASCENDING))
            
            docs = query.stream()
            return [{"commentId": doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error("Error fetching comments", post_id=post_id, error=str(e))
            raise
    
    async def get_area_data(self, area_name: str) -> Optional[Dict[str, Any]]:
        """Get area statistics"""
        try:
            doc = self.db.collection('areas').document(area_name).get()
            if doc.exists:
                return {"name": doc.id, **doc.to_dict()}
            return None
        except Exception as e:
            logger.error("Error fetching area data", area_name=area_name, error=str(e))
            raise

# Initialize Firebase service
firebase_service = FirebaseService()
