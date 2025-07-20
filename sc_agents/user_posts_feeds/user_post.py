from firestore_db import FireStoreDB
from gmaps_loc import GoogleMapsManager

from gemini_model import GeminiModel
from post_feed_utils.general import set_gemini_output_injson
from post_feed_utils.post_feed_utils import insert_geo_location

class UserPost(FireStoreDB):
    def __init__(self, gemini_api_key, fs_credential_json, gmaps_api_key):
        super().__init__(credential_json = fs_credential_json)
        self.gemini_model_obj = GeminiModel(api_key = gemini_api_key)
        self.gmaps_obj = GoogleMapsManager(api_key = gmaps_api_key)
        self.post_summaries_batch_for_feeds = 10


    def add_user_post_to_db(self, user_data, user_post_data, google_search = False):
        gemini_output = self.gemini_model_obj(
            task = "post_analysis", 
            google_search = google_search,
            user_post_message = user_post_data.get("message", "")
        )
        gemini_json_output = set_gemini_output_injson(gemini_output.text)
        insert_geo_location(self.gmaps_obj, user_post_data)
        gemini_json_output["location"].update(user_post_data)
        self.add_post_for_user(user_data, gemini_json_output)


    def get_feeds(self, issue_tag, center_lat, center_long, horizon, hours_back, delete_posts_from_db_after_feeds):
        similar_posts, found_queries = self.find_similar_reports(
            issue = issue_tag, 
            center_lat = center_lat,
            center_long = center_long, 
            radius_km = horizon, 
            hours_back = hours_back
        )
        final_summary = ""
        print(len(similar_posts), similar_posts)
        if similar_posts:
          district = similar_posts[0]["location"]["issue_location"]["district"]
          all_reqd_summaries = [post["analysis"]["summary"] for post in similar_posts]
          all_reqd_summaries = [all_reqd_summaries[i:i+self.post_summaries_batch_for_feeds] for i in range(0, len(all_reqd_summaries), self.post_summaries_batch_for_feeds)]
          
          # get final summary
          final_summary = self._get_final_summary(all_reqd_summaries, issue_tag, district)

          if delete_posts_from_db_after_feeds:
              for doc in found_queries:
                  doc.reference.delete()

        return final_summary

    def _get_final_summary(self, all_summaries, issue_tag, location):
        final_summary = ""
        for batch_summaries in all_summaries:
            batch_summaries.append(final_summary)
            summaries_in_string = ""
            for idx, ind_sum in enumerate(batch_summaries):
                summaries_in_string += f"{idx+1}: {ind_sum}\n"
            final_summary = self.gemini_model_obj(
                task = "similar_post_summarization", 
                issue_tag = issue_tag, 
                location = location,
                sumaries = summaries_in_string
                )
        return final_summary.text



if __name__ == "__main__":
    from constants import GEMINI_API_KEY, FS_CREDENTIAL_JSON, GOOGLE_MAPS_API_KEY
    from datetime import datetime
    usr_pst_obj = UserPost(
        gemini_api_key = GEMINI_API_KEY, 
        fs_credential_json = FS_CREDENTIAL_JSON, 
        gmaps_api_key = GOOGLE_MAPS_API_KEY
        )

    # to upload post in the db
    user_data = {
        'name': 'John',
        'email': 'john@example.com',
        'created_at': datetime.now()
    }
    message = """
    In my building, on the stairs, there are so many trash cans. It is stinking and difficult to pass through also there are so many 
    insects on it
    """
    user_post_data = {
        'message': message, 
        'issue_location': {
            'latitude': 12.89, 
            'longitude': 78.87, 
        },
        'current_user_location': {
            'latitude': 12.78, 
            'longitude': 79.12
        }
    }


    # to add user post to db
    usr_pst_obj.add_user_post_to_db(
        user_data = user_data, 
        user_post_data = user_post_data, 
        google_search = False
    )

    # to summarize the posts and create a feed
    final_feed = usr_pst_obj.get_feeds(
        issue_tag = 'wasteissue', 
        center_lat = 12.98, 
        center_long = 78.32,
        horizon = 10000, 
        hours_back = 10, 
        delete_posts_from_db_after_feeds = False
    )
    print(final_feed)




            








    

