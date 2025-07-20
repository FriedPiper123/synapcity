from google import genai
from google.genai import types

from post_feed_utils.prompt_creator import create_analysis_prompt, create_similar_posts_summarizer_prompt


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
            "similar_post_summarization": create_similar_posts_summarizer_prompt
        }


    def __call__(self, task, google_search=False, **kwargs):
        if task not in self.task_prompt_creator:
            raise ValueError(f"{task} is not supported. Supported tasks are {self.task_prompt_creator.keys()}")
        input_prompt = self.task_prompt_creator[task](kwargs)
        response = self.client.models.generate_content(
                                                model="gemini-2.5-flash",
                                                contents=input_prompt,
                                                config = self.config if google_search else None
                                                )
        return response


if __name__ == "__main__":
    gemini_obj = GeminiModel(api_key='pokok')
    output = gemini_obj()