import re
import json


def restructure_report(data):
    return {
        "location": {
            "current_user_location": {
                "description": None,
                "latitude": None, 
                "longitude": None
                },
            "issue_location": {
                "description": data.get("location"),
                "latitude": None, 
                "longitude": None
            }
        },
        "analysis": {
            "vulgarity": {
            "sentiment": data.get("sentiment"),
            "confidence_score": data.get("confidence"),
            "strength": data.get("strength"),
            },
            "issue_tag": data.get("issue"),
            "summary": data.get("summary"),
            "reasoning": data.get("reasoning"),
        },
    }
    
def convert_str_to_json(string_ele):
  return json.loads(string_ele)

def set_gemini_output_injson(output):
#   json_text = re.search(r'\{.*\}', output, re.DOTALL)

#   output_json = convert_str_to_json(output.group())
  output_json = convert_str_to_json(output)

  return restructure_report(output_json)