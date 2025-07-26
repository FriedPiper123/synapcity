import json
from datetime import datetime


def create_analysis_prompt(kwargs) -> str:
    """
    Creates a comprehensive prompt that combines sentiment analysis (vulgar content detection)
    and issue classification with location extraction and summarization.

    Args:
        message: The user message to analyze
        predefined_tags: List of existing issue tags (default: ['trafficissue', 'powerissue', 'waterissue'])

    Returns:
        Formatted prompt string for combined analysis
    """
    message = kwargs.get('user_post_message', '')
    predefined_tags = kwargs.get('predefined_tags', None)
    if predefined_tags is None:
        predefined_tags = ['trafficissue', 'powerissue', 'waterissue', 'internetissue', 'wasteissue']

    tags_list = str(predefined_tags)

    # Combined output schema
    combined_schema = {
        "type": "object",
        "properties": {
            "sentiment": {
                "type": "string",
                "enum": ["Vulgar", "Not Vulgar"],
                "description": "Content moderation classification"
            },
            "strength": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Strength score for sentiment classification"
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Confidence level of sentiment analysis"
            },
            "reasoning": {
                "type": "string",
                "description": "Brief explanation of sentiment classification"
            },

            "issue": {
                "type": "string",
                "description": "Issue category tag or 'no issue'"
            },
            "summary": {
                "type": "string",
                "description": "Concise summary of the message"
            },
            "location": {
                "type": "string",
                "description": "Geographic location or 'No location information available'"
            }
        },
        "required": ["sentiment", "strength", "confidence", "issue", "summary", "location"],
        "additionalProperties": False
    }

    schema_json = json.dumps(combined_schema, indent=2)

    prompt = f"""You are an advanced AI system for comprehensive message analysis. Perform both content moderation and issue classification on the user message.

    USER MESSAGE TO ANALYZE: "{message}"

    PREDEFINED ISSUE TAGS: {tags_list}

    ANALYSIS TASKS:

    🔍 TASK 1 - SENTIMENT ANALYSIS (Content Moderation):
    Classify the message as "Vulgar" or "Not Vulgar" based on these criteria:

    VULGAR Content Includes:
    - Profanity and swear words
    - Sexual or explicit content
    - Hate speech or discriminatory language
    - Threats or violent language
    - Derogatory terms or slurs
    - Inappropriate personal attacks

    NOT VULGAR Content:
    - General complaints or frustrations (without profanity)
    - Constructive criticism
    - Everyday conversation
    - Professional communication
    - Mild expressions of annoyance

    🏷️ TASK 2 - ISSUE CLASSIFICATION:
    Analyze the message for problems or issues:

    1. ISSUE DETECTION:
    - Look for problem indicators: broken, not working, issue, problem, trouble, failed, damaged
    - Identify complaints about services, infrastructure, or systems
    - If no problem detected, use "no issue"

    2. TAG ASSIGNMENT:
    - Match to closest predefined tag using semantic similarity
    - If no existing tag fits, create NEW short tag ending with "issue"
    - Examples: "trafficissue", "powerissue", "internetissue", "noiseissue"
    - Keep tags lowercase, under 15 characters

    3. SEMANTIC MATCHING:
    - Traffic: roads, vehicles, congestion, parking, transport, jam
    - Power: electricity, blackout, outage, electrical, current, voltage
    - Water: supply, leak, pressure, plumbing, drainage, tap

    📍 TASK 3 - LOCATION EXTRACTION:
    - Find geographic information: cities, areas, streets, landmarks
    - Look for location indicators: "in", "at", "near", "around", "from"
    - If no location found: "No location information available"

    📝 TASK 4 - SUMMARIZATION:
    - Create concise 1-2 sentence summary
    - Focus on core issue and key details
    - Keep under 50 characters when possible

    CLASSIFICATION EXAMPLES:

    Example 1: "Power outage in Koramangala since morning"
    → Not Vulgar, powerissue, "Power outage in Koramangala since morning", "Koramangala"

    Example 2: "Having a wonderful day, everything is great!"
    → Not Vulgar, no issue, "Positive comment about having a good day", "No location information available"

    OUTPUT SCHEMA:
    ```json
    {schema_json}
    ```

    SCORING GUIDELINES:
    - strength: How strongly the message fits the sentiment category (0.0-1.0)
    - confidence: Your confidence in both sentiment and issue classification (0.0-1.0)
    - reasoning: Brief explanation focusing on sentiment classification decision

    RESPONSE FORMAT:
    Return ONLY a valid JSON object matching the schema above. No additional text, explanations, or formatting.

    IMPORTANT:
    - Perform both sentiment analysis AND issue classification
    - Use exact schema structure and required fields
    - Ensure all numeric values are between 0 and 1
    - Return single issue tag based on semantic similarity
    - Include reasoning for sentiment classification decision
    """

    return prompt


def create_similar_posts_summarizer_prompt(kwargs):
    issue_tag = kwargs.get("issue_tag", "issue or problem")
    location = kwargs.get("location", "")
    summaries = kwargs.get("summaries", "")
    return f"""
        You are a intelligent complaint analyst. I have received multiple complaints related to the issue tag "{issue_tag}". 
        Each complaint includes a short summary of the problem. Your task is to read all the summaries and generate a single, 
        coherent summary that:
        - Captures the key recurring problems and patterns
        - Avoids repeating identical points
        - Groups similar issues together clearly
        - Uses clear and professional language

        Here are the summaries:

        {summaries}
        Please generate a concise summary paragraph highlighting the main concerns being reported at "{location}".  If the location value
        is missing or None, exclude any mention of location in the summary, otherwise mention the location in bold. Also note that the summary 
        should not exceed 30 words

        """

def summarizer_prompt(kwargs):
    """
    Generate a structured prompt for summarizing user posts about issues or events.
    
    Args:
        kwargs (dict): Configuration parameters including:
            - type (str): Type of content (issue/event)
            - issue_tag (str): Category/tag for the issue
            - location (str): Geographic location (optional)
            - summaries (str): Raw summaries to be processed
    
    Returns:
        str: Formatted prompt for the AI summarizer
    """
    curr_type = kwargs.get("type", "issue").strip()
    issue_tag = kwargs.get("issue_tag", "general concern").strip()
    location = kwargs.get("location", "").strip()
    summaries = kwargs.get("summaries", "").strip()
    time_from = kwargs.get("time_from", datetime.now())
    
    # Validate required inputs
    if not summaries:
        raise ValueError("Summaries parameter is required and cannot be empty")
    
    # Define the expected output schema
    output_schema = {
        "summary": "concise description of the main concerns (max 30 words)",
        "title": "title of the feed (max 10 words)",
        "external_references": [ {'link' : 'relevant_link_1', 'title' : 'title of the link', 'thumbnail' : 'thumbnail of the link' }, {'link' : 'relevant_link_2', 'title' : 'title of the link', 'thumbnail' : 'thumbnail of the link' } ],
        "severity": "low | medium | high | no_severity",
        "confidence": "low | medium | high",
    }
    
    # Build location instruction
    location_instruction = ""
    if location:
        location_instruction = f'Include the location "{location}" in bold (**{location}**) within your summary. '
    else:
        location_instruction = "Do not mention any location as none was specified. "
    
    prompt = f"""You are an intelligent social media and user post analyst specializing in categorizing and summarizing community reports.

TASK CONTEXT:
You have received multiple user posts of type "{curr_type}" with category "{issue_tag}". Your task is to analyze these individual summaries and create a comprehensive, actionable overview.

INPUT SUMMARIES:
{summaries}

ANALYSIS REQUIREMENTS:
1. **Content Analysis**: Read all summaries and identify common themes, patterns, and concerns
2. **Categorization**: Confirm or refine the category based on actual content
3. **External references and Research**: Conduct a web search to find 2-3 relevant articles or resources related to this issue/event.
   - All links must be direct (not redirects), publicly accessible, and return HTTP 200 OK and it should be the actual real links
     and not *vertexaisearch.cloud.google.com*
   - the links or references should not be old than {time_from}
   - *Please note* that you need to open the link, if it is irrelevant or invalid link that should not be included in my output. It is ok to not include 
      such links than to include it
   - Do not include placeholder, broken, redirect-only, or inaccessible links.
   - Prefer trusted sources (e.g. news outlets, official sites).

4. **Severity Assessment**: Rate the overall severity based on:
   - Number of reports
   - Potential impact on community
   - Urgency of response needed
   - Safety implications

SUMMARY GUIDELINES:
- Maximum 50 words for the main summary
- Use clear, professional language
- Group similar concerns together
- Avoid repetition of identical points
- Focus on actionable insights
- {location_instruction}

SEVERITY RATING CRITERIA:
- **high**: Immediate safety risk, widespread impact, urgent action required
- **medium**: Moderate impact, timely response needed, affects multiple people
- **low**: Minor issue, routine response adequate, limited impact
- **no_severity**: Informational only, no action required

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object matching this exact schema:

```json
{output_schema}
```

IMPORTANT: 
- Ensure all JSON syntax is correct
- Include actual web search results in the references.articles array
- Base severity rating on objective criteria, not just volume of reports
- Set confidence level based on clarity and consistency of the input data
"""

    return prompt

def create_route_prompt(kwargs) -> str:
    """
    Creates a prompt for the AI agent to fetch the best route between two locations.
    Args:
        origin: dict with 'latitude' and 'longitude'
        destination: dict with 'latitude' and 'longitude'
        mode: str, travel mode (driving, walking, bicycling, transit)
    Returns:
        Formatted prompt string for route fetching
    """
    origin = kwargs.get('origin', {})
    destination = kwargs.get('destination', {})
    mode = kwargs.get('mode', 'driving')
    output_schema = {
        "type": "object",
        "properties": {
            "route": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "step": {"type": "string"},
                        "distance": {"type": "string"},
                        "duration": {"type": "string"},
                        "instruction": {"type": "string"}
                    },
                    "required": ["step", "distance", "duration", "instruction"]
                }
            },
            "total_distance": {"type": "string"},
            "total_duration": {"type": "string"},
            "mode": {"type": "string"}
        },
        "required": ["route", "total_distance", "total_duration", "mode"]
    }
    schema_json = json.dumps(output_schema, indent=2)
    prompt = f"""You are an advanced AI navigation assistant. Given the following origin and destination coordinates, use Google Maps or a similar tool to find the best route for the specified travel mode. Return the route as a list of steps, each with a step number, distance, duration, and instruction. Also include the total distance and duration for the route.\n\nORIGIN: {origin}\nDESTINATION: {destination}\nMODE: {mode}\n\nOUTPUT SCHEMA:\n```json\n{schema_json}\n```\n\nReturn ONLY a valid JSON object matching the schema above. No additional text or explanation."""
    return prompt

def create_location_prediction_prompt(kwargs) -> str:
    """
    Creates a prompt for intelligent location prediction and suggestions based on user input.
    Similar to Google Maps' location prediction system.
    
    Args:
        user_input: The user's location input text
        context: Additional context like current location, recent searches, etc.
        location_type: Type of location being searched (address, business, landmark, etc.)
        city: Target city (default: Bangalore)
    
    Returns:
        Formatted prompt string for location prediction
    """
    user_input = kwargs.get('user_input', '')
    context = kwargs.get('context', '')
    location_type = kwargs.get('location_type', 'general')
    city = kwargs.get('city', 'Bangalore')
    
    output_schema = {
        "type": "object",
        "properties": {
            "predictions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Full location name"},
                        "short_name": {"type": "string", "description": "Short display name"},
                        "type": {"type": "string", "description": "Location type (area, landmark, business, transport, etc.)"},
                        "category": {"type": "string", "description": "Specific category (restaurant, mall, hospital, etc.)"},
                        "confidence": {"type": "number", "description": "Confidence score 0-1"},
                        "coordinates": {
                            "type": "object",
                            "properties": {
                                "latitude": {"type": "number"},
                                "longitude": {"type": "number"}
                            }
                        },
                        "description": {"type": "string", "description": "Brief description or additional info"},
                        "popularity": {"type": "string", "description": "Popularity level (high, medium, low)"}
                    },
                    "required": ["name", "short_name", "type", "category", "confidence", "coordinates", "description", "popularity"]
                }
            },
            "search_suggestions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Alternative search terms that might help"
            },
            "context_aware": {
                "type": "boolean",
                "description": "Whether predictions are context-aware"
            }
        },
        "required": ["predictions", "search_suggestions", "context_aware"]
    }
    
    schema_json = json.dumps(output_schema, indent=2)
    
    # Define Bangalore-specific location categories
    bangalore_categories = {
        "areas": ["Koramangala", "Indiranagar", "Whitefield", "Electronic City", "HSR Layout", "JP Nagar", "Banashankari", "Jayanagar", "Malleswaram", "Rajajinagar", "Yeshwanthpur", "Hebbal", "Bellandur", "Bannerghatta", "Domlur", "Frazer Town", "Richmond Town", "Cox Town", "Ulsoor", "Lavelle Road"],
        "landmarks": ["Cubbon Park", "Lalbagh Botanical Garden", "Bangalore Palace", "Vidhana Soudha", "High Court", "Tipu Sultan Palace", "ISKCON Temple", "Bull Temple", "Gavi Gangadhareshwara Temple", "St. Mary Basilica", "St. Mark Cathedral", "Bangalore Fort", "Freedom Park", "Jawaharlal Nehru Planetarium", "Government Museum", "Venkatappa Art Gallery"],
        "transport": ["Kempegowda International Airport", "Bangalore City Railway Station", "Yeshwanthpur Railway Station", "Krishnarajapuram Railway Station", "Bangalore Metro", "Majestic Metro Station", "Indiranagar Metro Station", "Koramangala Metro Station", "HSR Layout Metro Station", "Electronic City Metro Station", "Whitefield Metro Station"],
        "shopping": ["Phoenix MarketCity", "Forum Koramangala", "Garuda Mall", "Orion Mall", "Mantri Square", "VR Mall", "UB City", "Commercial Street", "Chickpet Market", "Russell Market", "KR Market", "Malleswaram Market", "Jayanagar 4th Block Market"],
        "business": ["Manyata Tech Park", "Embassy Tech Village", "Prestige Tech Park", "Bagmane Tech Park", "RMZ Ecoworld", "Prestige Shantiniketan", "Embassy Golf Links", "Cessna Business Park", "Salarpuria Sattva Knowledge Park", "Divyasree Technopolis"],
        "education": ["Indian Institute of Science", "Bangalore University", "Christ University", "St. Joseph College", "Mount Carmel College", "St. Xavier College", "St. John Medical College", "MS Ramaiah Medical College", "Kempegowda Institute of Medical Sciences"],
        "healthcare": ["Apollo Hospital", "Manipal Hospital", "Fortis Hospital", "Narayana Health", "Sakra World Hospital", "Columbia Asia Hospital", "Sparsh Hospital", "Bangalore Medical College", "Victoria Hospital", "Bowring Hospital"],
        "food": ["UB City Food Court", "Food Street", "Koramangala Food Street", "Indiranagar 100 Feet Road", "Commercial Street Food", "Malleswaram 8th Cross", "Jayanagar 4th Block Food", "Banashankari Food Street", "HSR Layout Food Street", "Electronic City Food Court"],
        "parks": ["Cubbon Park", "Lalbagh Botanical Garden", "Bannerghatta National Park", "Freedom Park", "Bugle Rock Park", "Jayanagar Park", "Indiranagar Park", "Koramangala Park", "HSR Layout Park", "Whitefield Park"]
    }
    
    prompt = f"""You are an advanced AI location prediction system for {city}, India. Your task is to intelligently predict and suggest locations based on user input, similar to Google Maps' location suggestions.

USER INPUT: "{user_input}"
CONTEXT: {context}
LOCATION TYPE: {location_type}

PREDICTION TASKS:

🔍 TASK 1 - INPUT ANALYSIS:
- Analyze the user input for location keywords, partial names, abbreviations
- Identify potential location types (area, landmark, business, transport, etc.)
- Detect spelling variations, common abbreviations, and nicknames
- Consider phonetic similarities and common misspellings

📍 TASK 2 - LOCATION PREDICTION:
Based on the input, predict the most likely locations in {city}:

AVAILABLE CATEGORIES:
{json.dumps(bangalore_categories, indent=2)}

PREDICTION GUIDELINES:
1. **Exact Matches**: Prioritize exact name matches
2. **Partial Matches**: Include locations that contain the input text
3. **Fuzzy Matches**: Consider similar spellings and common variations
4. **Context Awareness**: Use context to improve predictions
5. **Popularity**: Consider location popularity and relevance
6. **Geographic Relevance**: Focus on {city} locations only

🎯 TASK 3 - CONFIDENCE SCORING:
- 0.9-1.0: Exact match or very high confidence
- 0.7-0.9: Strong partial match
- 0.5-0.7: Moderate match with some uncertainty
- 0.3-0.5: Weak match, low confidence
- 0.1-0.3: Very weak match, minimal confidence

📊 TASK 4 - POPULARITY ASSESSMENT:
- **high**: Very popular, well-known locations
- **medium**: Moderately popular locations
- **low**: Lesser-known or niche locations

🔍 TASK 5 - SEARCH SUGGESTIONS:
Generate alternative search terms that might help users find what they're looking for.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object matching this schema:

```json
{schema_json}
```

EXAMPLES:

Input: "koramangala"
→ Predictions: Koramangala area, Koramangala Metro Station, Koramangala Food Street, etc.

Input: "airport"
→ Predictions: Kempegowda International Airport

Input: "mall"
→ Predictions: Phoenix MarketCity, Forum Koramangala, Garuda Mall, etc.

Input: "tech park"
→ Predictions: Manyata Tech Park, Embassy Tech Village, Prestige Tech Park, etc.

IMPORTANT:
- Focus only on {city} locations
- Provide accurate coordinates for each prediction
- Include relevant descriptions and categories
- Order by confidence and popularity
- Generate helpful search suggestions
- Ensure all coordinates are valid for {city}
"""

    return prompt