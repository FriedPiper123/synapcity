from datetime import datetime, timedelta
import firebase_admin
from google.cloud.firestore_v1 import FieldFilter
from firebase_admin import credentials, firestore

from post_feed_utils.post_feed_utils import haversine_distance


class FireStoreDB:
    def __init__(self, credential_json):
        if not firebase_admin._apps:
            cred = credentials.Certificate(credential_json)
            firebase_admin.initialize_app(cred)

        self.db = firestore.client()
        self.doc_ref = self.db.collection('posts').document()

    def update_data(self, provided_data):
        if provided_data["analysis"]["vulgarity"]['sentiment'].lower() != 'vulgar':
            self.doc_ref.set(provided_data)


    def get_or_create_user(self, user_data):
        email = user_data.get("email")
        if not email:
            raise ValueError("Email is required to check user existence.")

        users_ref = self.db.collection("users")
        query = users_ref.where(filter=FieldFilter("email", "==", email)).limit(1).stream()

        for doc in query:
            print(f"User already exists: {doc.id}")
            return doc.id

        user_data["created_at"] = datetime.now()
        new_doc_ref = users_ref.add(user_data)[1]
        print(f"New user added: {new_doc_ref.id}")
        return new_doc_ref.id

    def add_post_for_user(self, user_data, post_data):
        """
        Adds a post to 'posts' collection, including reference to user_id.
        """
        user_id = self.get_or_create_user(user_data)
        post_data["user_id"] = user_id
        post_data["created_at"] = datetime.now()
        post_ref = self.db.collection("posts").add(post_data)[1]
        print(f"Post added with ID: {post_ref.id}")
        return post_ref.id

    def delete_alldocincollection(self, collection_name: str):
        for doc in self.db.collection(collection_name).stream():
            doc.reference.delete()

    def find_similar_reports(self, issue, center_lat, center_long, radius_km, hours_back):
        """
        Find reports with the same issue, on the same date, within a radius of (lat, long).
        """
        day_end = datetime.now()
        day_start = day_end - timedelta(hours=hours_back)

        query = self.db.collection("posts") \
            .where(filter=FieldFilter("created_at", ">=", day_start)) \
            .where(filter=FieldFilter("created_at", "<", day_end)) \
            .where(filter=FieldFilter("analysis.issue_tag", "==", issue)) \
            .stream()

        results = []
        for doc in query:
            data = doc.to_dict()
            lat = data["location"]["issue_location"]["latitude"]
            lon = data["location"]["issue_location"]["longitude"]
            if center_lat is not None and center_long is not None:
                distance = haversine_distance(center_lat, center_long, lat, lon)
                if distance <= radius_km:
                    results.append(data)

        return results, query
