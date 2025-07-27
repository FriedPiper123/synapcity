from google import genai
from google.genai import types
from .post_feed_utils.prompt_creator import (
    create_analysis_prompt, 
    create_similar_posts_summarizer_prompt, 
    create_summarizer_prompt_without_using_external_sources, 
    create_summarizer_prompt_using_external_sources, 
    create_route_prompt,
    create_location_prediction_prompt,
    create_image_content_analysis_prompt)
from .constants import GEMINI_API_KEY
import re
import json

def set_gemini_output_injson(output):
  json_text = re.search(r'\{.*\}', output, re.DOTALL)
  output_json = json.loads(json_text.group())
  return output_json
  
class GeminiModel:
    def __init__(self, api_key) -> None:
        self.client = genai.Client(api_key=api_key)
        #Define the grounding tool
        grounding_tool = types.Tool(
            google_search=types.GoogleSearch()
        )

        # Configure generation settings
        self.config = types.GenerateContentConfig(
            tools=[grounding_tool]
        )
        self.task_prompt_creator = {
            "post_analysis": create_analysis_prompt, 
            "similar_post_summarization": create_similar_posts_summarizer_prompt, 
            "summarizer_prompt_without_using_external_sources": create_summarizer_prompt_without_using_external_sources,
            "summarizer_prompt_using_external_sources": create_summarizer_prompt_using_external_sources, 
            "route": create_route_prompt,
            "location_prediction": create_location_prediction_prompt,
            "image_content_analysis": create_image_content_analysis_prompt
        }


    def __call__(self, task, google_search=False, gemini_model_type = "gemini-2.5-flash", **kwargs):
        if task not in self.task_prompt_creator:
            raise ValueError(f"{task} is not supported. Supported tasks are {self.task_prompt_creator.keys()}")
        input_prompt = self.task_prompt_creator[task](kwargs)
        response = self.client.models.generate_content(
                                                model=gemini_model_type,
                                                contents=input_prompt,
                                                config = self.config if google_search else None
                                                )
        return set_gemini_output_injson(response.text)



GeminiAgent = GeminiModel(api_key=GEMINI_API_KEY)



if __name__ == "__main__":
    img_path = "/app/synapcity/backend/app/agents/user_posts_feeds/istockphoto-95658927-612x612.jpg"
    user_content = "There is a pothole on the roads of HSR bangalore"
    import time
    from pprint import pprint
    for _ in range(3):
        st = time.perf_counter()
        a = GeminiAgent(gemini_model_type = "gemini-2.5-flash-lite", 
                        task = "image_content_analysis", 
                        img_path = img_path, user_content = user_content
                        )
        print(time.perf_counter() - st)
    pprint(a)

    user_message = "i am having a good day at hsr"
    for _ in range(3):
        st = time.perf_counter()
        a = GeminiAgent(gemini_model_type = "gemini-2.5-flash-lite", 
                        task = "post_analysis", 
                        user_post_message = user_message
                        )
        print(time.perf_counter() - st)
    pprint(a)

