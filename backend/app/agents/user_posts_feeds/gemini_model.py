import google.generativeai as genai
from .post_feed_utils.prompt_creator import create_analysis_prompt, create_similar_posts_summarizer_prompt,summarizer_prompt, create_route_prompt, create_location_prediction_prompt
from .constants import GEMINI_API_KEY

import json
import re

def set_gemini_output_injson(output):
  json_text = re.search(r'\{.*\}', output, re.DOTALL)
  print(json_text.group())
  output_json = json.loads(json_text.group())
  return output_json
  
class GeminiModel:
    def __init__(self, api_key) -> None:
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.task_prompt_creator = {
            "post_analysis": create_analysis_prompt, 
            "similar_post_summarization": create_similar_posts_summarizer_prompt, 
            "summarizer": summarizer_prompt,
            "route": create_route_prompt,
            "location_prediction": create_location_prediction_prompt
        }

    def __call__(self, task, google_search=False, gemini_model_type = "gemini-2.0-flash-exp", **kwargs):
        if task not in self.task_prompt_creator:
            raise ValueError(f"{task} is not supported. Supported tasks are {self.task_prompt_creator.keys()}")
        input_prompt = self.task_prompt_creator[task](kwargs)
        response = self.model.generate_content(input_prompt)
        return set_gemini_output_injson(response.text)

GeminiAgent = GeminiModel(api_key=GEMINI_API_KEY)

