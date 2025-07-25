import math
import difflib
from collections import defaultdict
from datetime import datetime, timedelta

from .general import is_valid_url


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers.
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c  # in kilometers


def insert_geo_location(gmaps_manager_obj, data):
    if isinstance(data, dict):
        lat = data.get('latitude')
        lon = data.get('longitude')
        if lat is not None and lon is not None:
            # Do reverse geocoding
            location_result = gmaps_manager_obj.get_state_from_coordinates(lat, lon)
            data['country'] = location_result[0]
            data['state'] = location_result[1]
            data['district'] = location_result[2]
        # Recurse into nested dicts
        for key, value in data.items():
            insert_geo_location(gmaps_manager_obj, value)


def score_links_with_google(summary_text, links, topk = 3):
    scored_links = []

    for item in links:
        best_score = 0
        link = item["link"]
        score = difflib.SequenceMatcher(None, link, summary_text).ratio()
        best_score = max(best_score, score)

        # take only valid links
        if is_valid_url(link):
            scored_links.append((link, best_score))
    
    # Sort by best_score descending
    scored_links.sort(key=lambda x: x[1], reverse=True)
    return [link for link, score in scored_links[:topk]]

def group_all_posts_by_category(all_posts):
    grouped_by_category = defaultdict(list)

    for post in all_posts:
        category = post["category"]
        grouped_by_category[category].append(post)
    return dict(grouped_by_category)

def get_all_posts_summary(gemini_model, all_posts, post_summaries_batch_for_feeds = 20, topk_links = 3, hours_back = 24):
    grouped_categories = group_all_posts_by_category(all_posts)
    summaries = {}
    for category, posts in grouped_categories.items():
        contents = [p["content"] for p in posts]
        curr_type = posts[0]["type"]
        location_neighborhood = posts[0]["neighborhood"]
        contents = [contents[i:i+post_summaries_batch_for_feeds] for i in range(0, len(contents), post_summaries_batch_for_feeds)]

        final_summary = ""
        get_all_links = []
        for batch_content in contents:
            batch_content.append(final_summary)
            summaries_in_string = ""
            for idx, cont in enumerate(batch_content):
                summaries_in_string += f"{idx+1}: {cont}\n"
            output_json = gemini_model(
                task = "summarizer", 
                type = curr_type,
                issue_tag = category, 
                location = location_neighborhood,
                summaries = summaries_in_string, 
                google_search=True, 
                time_from = datetime.now() - timedelta(hours=hours_back)
                )
            final_summary = output_json["summary"]
            get_all_links.extend(output_json["external_references"])
        
        output_json.update({
            "type": curr_type, 
            "category": category, 
            "location": location_neighborhood,
            "posts_counts": len(posts),
            "related_feeds" : [p["postId"] for p in posts]
        })
        summaries[category] = output_json
        links = score_links_with_google(final_summary, get_all_links, topk = topk_links)
        output_json["external_references"] = links
    return summaries