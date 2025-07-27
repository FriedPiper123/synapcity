if __name__ == "__main__":

    all_post = [
    {"content":"There's a large pothole on 15 A main,that needs immediate attention. It's causing traffic issues and could damage vehicles.","type":"issue","category":"infrastructure1","location":{"latitude":12.9070415,"longitude":77.6398914},"neighborhood":"Current Location","mediaUrl":None,"parentId":None,"geohash":"tdr1qt","postId":"d3fc23ab-1baf-47a1-b4c7-4615c685e010","authorId":"CejnHSpTVhOJm44P6mbJDKM0YG63","upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":2,"createdAt":"2025-07-21T00:18:58.509886Z","status":"active"},
    {"content":"There's a large pothole on 15 A main,that needs immediate attention. It's causing traffic issues and could damage vehicles.","type":"issue","category":"infrastructure","location":{"latitude":12.9070415,"longitude":77.6398914},"neighborhood":"Current Location","mediaUrl":None,"parentId":None,"geohash":"tdr1qt","postId":"d3fc23ab-1baf-47a1-b4c7-4615c685e010","authorId":"CejnHSpTVhOJm44P6mbJDKM0YG63","upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":2,"createdAt":"2025-07-21T00:18:58.509886Z","status":"active"},
    {"content":"There's a large pothole on 15 A main,that needs immediate attention. It's causing traffic issues and could damage vehicles.","type":"issue","category":"infrastructure","location":{"latitude":12.9070415,"longitude":77.6398914},"neighborhood":"Current Location","mediaUrl":None,"parentId":None,"geohash":"tdr1qt","postId":"d3fc23ab-1baf-47a1-b4c7-4615c685e010","authorId":"CejnHSpTVhOJm44P6mbJDKM0YG63","upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":2,"createdAt":"2025-07-21T00:18:58.509886Z","status":"active"}
    ]

    from .gemini_model import GeminiModel
    from .constants import GEMINI_API_KEY
    from .post_feed_utils.post_feed_utils import get_all_posts_summary, get_summary_links
    from pprint import pprint
    gmo = GeminiModel(GEMINI_API_KEY)
    import time
    for _ in range(3):
        st = time.perf_counter()
        a = get_all_posts_summary(gemini_model = gmo, 
                                all_posts = all_post, 
                                post_summaries_batch_for_feeds = 20 
                                )
        print(time.perf_counter() - st)
    pprint(a)
    feed_data = {
        "type": "issue", 
        "category": "infrastructure", 
        "neighborhood": "HSR", 
        "summary": f"""
                    A large pothole on 15 A main is causing traffic issues and potential vehicle damage, requiring immediate attention.
                    """
    }
    for _ in range(3):
        st = time.perf_counter()
        a = get_summary_links(
            gemini_model=gmo, 
            feed_data=feed_data, 
            topk_links=3, 
            hours_back=24
        )
        print(time.perf_counter() - st)
    pprint(a)