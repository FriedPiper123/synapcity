import json

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