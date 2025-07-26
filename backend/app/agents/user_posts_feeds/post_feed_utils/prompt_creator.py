import json
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path
from google.genai import types



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

def create_summarizer_prompt_without_using_external_sources(kwargs):
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
    contents = kwargs.get("summaries", "").strip()

    
    # Define the expected output schema
    output_schema = {
        "summary": "concise description of the main concerns (max 30 words)",
        "title": "title of the feed (max 10 words)",
        "severity": "low | medium | high | no_severity",
        "confidence": "low | medium | high",
    }
    
    prompt = f"""You are an intelligent social media and user post analyst specializing in categorizing and summarizing community reports.

TASK CONTEXT:
You have received multiple user posts of type "{curr_type}" with category "{issue_tag}". Your task is to analyze these individual summaries and create a comprehensive, actionable overview.

INPUT CONTENTS:
{contents}

ANALYSIS REQUIREMENTS:
1. **Content Analysis**: Read all contents and identify common themes, patterns, and concerns
2. **Categorization**: Confirm or refine the category based on actual content

3. **Severity Assessment**: Rate the overall severity based on:
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
- Base severity rating on objective criteria, not just volume of reports
- Set confidence level based on clarity and consistency of the input data
"""

    return prompt


def create_summarizer_prompt_using_external_sources(kwargs):
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
    time_from = kwargs.get("time_from", datetime.now().strftime("%d/%m/%Y"))
    
    # Validate required inputs
    if not summaries:
        raise ValueError("Summaries parameter is required and cannot be empty")
    
    # Define the expected output schema
    output_schema = {
        "summary": "concise description of the main concerns (max 30 words)",
        "title": "title of the feed (max 10 words)",
        "external_references": [ {'link' : 'relevant_link_1', 'title' : 'title of the link', 'thumbnail' : 'thumbnail of the link' }, {'link' : 'relevant_link_2', 'title' : 'title of the link', 'thumbnail' : 'thumbnail of the link' } ],
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


SUMMARY GUIDELINES:
- Maximum 50 words for the main summary
- Use clear, professional language
- Group similar concerns together
- Avoid repetition of identical points
- Focus on actionable insights
- {location_instruction}

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object matching this exact schema:

```json
{output_schema}
```

IMPORTANT: 
- Ensure all JSON syntax is correct
- Include actual web search results in the references.articles array
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
    Optimized prompt for Google Gemini to get fastest and most accurate location predictions.
    
    Key optimizations:
    1. Simplified schema for faster processing
    2. More specific instructions for better accuracy
    3. Pre-filtered location data for speed
    4. Clear output format for consistent parsing
    """
    user_input = kwargs.get('user_input', '').strip().lower()
    context = kwargs.get('context', '')
    location_type = kwargs.get('location_type', 'general')
    city = kwargs.get('city', 'Bangalore')
    max_results = kwargs.get('max_results', 5)
    
    # Pre-defined high-confidence locations for instant matching
    quick_matches = get_quick_matches(user_input, city)
    
    # Simplified prompt structure
    prompt = f"""You are a location predictor for {city}, India. 

User is searching for: "{user_input}"

{f"QUICK MATCH FOUND: {quick_matches}" if quick_matches else ""}

Return exactly {max_results} location predictions in this JSON format:

{{
    "predictions": [
        {{
            "name": "Full location name",
            "display": "Short display name", 
            "type": "area",
            "confidence": 0.95,
            "lat": 12.9352,
            "lng": 77.6245,
            "popular": true
        }}
    ],
    "suggestions": ["alternative search terms"]
}}

Popular {city} locations to consider:
- Areas: Koramangala, Indiranagar, Whitefield, Electronic City, HSR Layout, BTM Layout, Jayanagar, Malleshwaram, Banashankari, JP Nagar, Rajajinagar, Hebbal, Bellandur, Marathahalli, Sarjapur
- Landmarks: Cubbon Park, Lalbagh, Bangalore Palace, Vidhana Soudha, ISKCON Temple, UB City, MG Road, Brigade Road, Commercial Street
- Transport: Kempegowda Airport, Majestic Station, Metro Stations
- Shopping: Phoenix Mall, Forum Mall, Garuda Mall, Orion Mall, Mantri Square
- Tech: Manyata Tech Park, Embassy Tech Village, Electronic City, Whitefield IT Parks

Return ONLY valid JSON. No explanations."""

    return prompt


def get_quick_matches(user_input: str, city: str) -> str:
    """
    Pre-filter for instant high-confidence matches to speed up processing
    """
    # Comprehensive Bangalore locations database
    quick_map = {
        # Airports & Transport Hubs
        'airport': 'Kempegowda International Airport',
        'kg airport': 'Kempegowda International Airport', 
        'kia': 'Kempegowda International Airport',
        'international airport': 'Kempegowda International Airport',
        'majestic': 'Majestic Bus Station',
        'city railway': 'Bangalore City Railway Station',
        'cantonment': 'Cantonment Railway Station',
        'yesvantpur': 'Yesvantpur Junction',
        'kr puram': 'KR Puram Railway Station',
        # Exhibition & Convention Centers
        'biec': 'Bangalore International Exhibition Centre',
        'exhibition center': 'Bangalore International Exhibition Centre',
        'exhibition centre': 'Bangalore International Centre',
        'international exhibition': 'Bangalore International Exhibition Centre',
        'hitex': 'HITEX Exhibition Centre',
        'nimhans convention': 'NIMHANS Convention Centre',
        'trade center': 'World Trade Center Bangalore',
        'wtc': 'World Trade Center Bangalore',
        # Major Roads & Areas
        'mg road': 'MG Road',
        'brigade': 'Brigade Road',
        'commercial': 'Commercial Street',
        'residency road': 'Residency Road',
        'richmond road': 'Richmond Road',
        'cunningham road': 'Cunningham Road',
        'kasturba road': 'Kasturba Road',
        'lavelle road': 'Lavelle Road',
        'church street': 'Church Street',
        'st marks road': 'St Marks Road',
        'double road': 'Double Road',
        'infantry road': 'Infantry Road',
        'outer ring road': 'Outer Ring Road',
        'orr': 'Outer Ring Road',
        'sarjapur road': 'Sarjapur Road',
        'bannerghatta road': 'Bannerghatta Road',
        'hosur road': 'Hosur Road',
        'old airport road': 'Old Airport Road',
        'airport road': 'Kempegowda International Airport Road',
        'bellary road': 'Bellary Road',
        'tumkur road': 'Tumkur Road',
        'mysore road': 'Mysore Road',
        'magadi road': 'Magadi Road',
        # Parks & Gardens
        'cubbon': 'Cubbon Park',
        'lalbagh': 'Lalbagh Botanical Garden',
        'botanical garden': 'Lalbagh Botanical Garden',
        'bannerghatta park': 'Bannerghatta Biological Park',
        'bannerghatta zoo': 'Bannerghatta National Park',
        'freedom park': 'Freedom Park',
        'bugle rock': 'Bugle Rock Park',
        'ulsoor lake': 'Ulsoor Lake',
        'sankey tank': 'Sankey Tank',
        'hebbal lake': 'Hebbal Lake',
        # Shopping Malls
        'ub city': 'UB City Mall',
        'forum': 'Forum Mall',
        'phoenix': 'Phoenix MarketCity',
        'garuda': 'Garuda Mall',
        'orion': 'Orion Mall',
        'mantri': 'Mantri Square',
        'vr mall': 'VR Bengaluru',
        'total mall': 'Total Mall',
        'gopalan mall': 'Gopalan Innovation Mall',
        'nexus': 'Nexus Mall',
        'elements mall': 'Elements Mall',
        # Temples & Religious Places
        'iskcon': 'ISKCON Temple',
        'bull temple': 'Bull Temple',
        'dodda ganesha': 'Dodda Ganesha Temple',
        'gavi gangadhareshwara': 'Gavi Gangadhareshwara Temple',
        'someshwara': 'Someshwara Temple',
        'st mary': 'St Mary Basilica',
        'st marks cathedral': 'St Marks Cathedral',
        'holy trinity': 'Holy Trinity Church',
        # Landmarks
        'palace': 'Bangalore Palace',
        'vidhana soudha': 'Vidhana Soudha',
        'high court': 'Karnataka High Court',
        'tipu palace': 'Tipu Sultan Summer Palace',
        'bangalore fort': 'Bangalore Fort',
        'mayo hall': 'Mayo Hall',
        'town hall': 'Town Hall',
        'raj bhavan': 'Raj Bhavan',
        # Areas & Localities
        'electronic': 'Electronic City',
        'koramangala': 'Koramangala',
        'indiranagar': 'Indiranagar',  
        'whitefield': 'Whitefield',
        'hsr': 'HSR Layout',
        'btm': 'BTM Layout',
        'jp nagar': 'JP Nagar',
        'jayanagar': 'Jayanagar',
        'malleshwaram': 'Malleshwaram',
        'banashankari': 'Banashankari',
        'rajajinagar': 'Rajajinagar',
        'hebbal': 'Hebbal',
        'bellandur': 'Bellandur',
        'marathahalli': 'Marathahalli',
        'yelahanka': 'Yelahanka',
        'rt nagar': 'RT Nagar',
        'rr nagar': 'RR Nagar',
        'vijayanagar': 'Vijayanagar',
        'basavanagudi': 'Basavanagudi',
        'shivajinagar': 'Shivajinagar',
        'gandhinagar': 'Gandhinagar',
        'chickpet': 'Chickpet',
        'cottonpet': 'Cottonpet',
        'chamarajpet': 'Chamarajpet',
        'seshadripuram': 'Seshadripuram',
        'sadashivanagar': 'Sadashivanagar',
        'dollars colony': 'Dollars Colony',
        'benson town': 'Benson Town',
        'frazer town': 'Frazer Town',
        'cox town': 'Cox Town',
        'richmond town': 'Richmond Town',
        'langford town': 'Langford Town',
        'austin town': 'Austin Town',
        'jeevanbhimanagar': 'Jeevanbhimanagar',
        'adugodi': 'Adugodi',
        'ejipura': 'Ejipura',
        'domlur': 'Domlur',
        'kalyan nagar': 'Kalyan Nagar',
        'banaswadi': 'Banaswadi',
        'hoodi': 'Hoodi',
        'mahadevapura': 'Mahadevapura',
        'brookefield': 'Brookefield',
        'kadugodi': 'Kadugodi',
        'varthur': 'Varthur',
        'sarjapur': 'Sarjapur',
        'carmelaram': 'Carmelaram',
        'bommanahalli': 'Bommanahalli',
        'hongasandra': 'Hongasandra',
        'begur': 'Begur',
        'hulimavu': 'Hulimavu',
        'arekere': 'Arekere',
        'banashankari': 'Banashankari',
        'girinagar': 'Girinagar',
        'uttarahalli': 'Uttarahalli',
        'kengeri': 'Kengeri',
        'rajarajeshwari nagar': 'Rajarajeshwari Nagar',
        'rr nagar': 'Rajarajeshwari Nagar',
        'nagarbhavi': 'Nagarbhavi',
        'herohalli': 'Herohalli',
        'peenya': 'Peenya',
        'jalahalli': 'Jalahalli',
        'mathikere': 'Mathikere',
        'yeshwanthpur': 'Yeshwanthpur',
        # Tech Parks & IT Hubs
        'manyata': 'Manyata Tech Park',
        'embassy tech': 'Embassy Tech Village',
        'prestige tech': 'Prestige Tech Park',
        'bagmane': 'Bagmane Tech Park',
        'rmz ecoworld': 'RMZ Ecoworld',
        'ecospace': 'RMZ Ecospace',
        'cessna': 'Cessna Business Park',
        'divyasree': 'Divyasree Technopolis',
        'salarpuria': 'Salarpuria Sattva Knowledge City',
        'brigade technopark': 'Brigade Technopark',
        'prestige shantiniketan': 'Prestige Shantiniketan',
        'embassy golf': 'Embassy Golf Links',
        'itpl': 'International Tech Park Limited',
        'global village': 'Global Village Tech Park',
        # Hospitals
        'apollo': 'Apollo Hospital',
        'manipal': 'Manipal Hospital',
        'fortis': 'Fortis Hospital',
        'narayana': 'Narayana Health',
        'sakra': 'Sakra World Hospital',
        'columbia asia': 'Columbia Asia Hospital',
        'sparsh': 'Sparsh Hospital',
        'victoria': 'Victoria Hospital',
        'bowring': 'Bowring Hospital',
        'st john': 'St John Medical College Hospital',
        'ramaiah': 'MS Ramaiah Medical College',
        'kims': 'Kempegowda Institute of Medical Sciences',
        'nimhans': 'NIMHANS',
        # Educational Institutions
        'iisc': 'Indian Institute of Science',
        'bangalore university': 'Bangalore University',
        'christ university': 'Christ University',
        'st joseph': 'St Joseph College',
        'mount carmel': 'Mount Carmel College',
        'st xavier': 'St Xavier College',
        'presidency': 'Presidency College',
        'national college': 'National College',
        'central college': 'Central College',
        'womens christian': 'Womens Christian College',
        'reva university': 'REVA University',
        'pes university': 'PES University',
        'bms college': 'BMS College of Engineering',
        'rv college': 'RV College of Engineering',
        'msrit': 'MS Ramaiah Institute of Technology',
        'pesit': 'PES Institute of Technology',
        'cmr institute': 'CMR Institute of Technology',
        # Markets
        'kr market': 'KR Market',
        'russell market': 'Russell Market',
        'chickpet market': 'Chickpet Market',
        'malleswaram market': 'Malleswaram Market',
        'city market': 'City Market',
        'avenue road': 'Avenue Road',
        'shivaji nagar bus': 'Shivajinagar Bus Stand'
    }
    
    # Only return exact matches or very close matches
    for key, value in quick_map.items():
        # Exact match
        if user_input == key:
            return f"HIGH CONFIDENCE: '{value}'"
        # Very close match (key is a significant part of the input)
        elif len(key) >= 3 and (key in user_input and len(key) >= len(user_input) * 0.7):
            return f"HIGH CONFIDENCE: '{value}'"
    
    return ""

def create_image_content_analysis_prompt(kwargs):
    img_path = kwargs.get("img_path", None)
    user_content = kwargs.get("user_content", "")
    output_schema = {
        "caption": "caption of the given image", 
        "confidence": "float value between 0 and 1 representing confidence in the caption"
    }
    if Path(img_path).exists():
        with open(img_path, 'rb') as f:
            image_bytes = f.read()

    prompt = f"""
You are a skilled image analyst. Given the following image and related user content, generate a concise and descriptive caption summarizing the main content of the image.

IMAGE PATH: {img_path if img_path else 'No image path provided'}

USER CONTENT:
\"\"\"
{user_content}
\"\"\"

Your response should include:

1. A clear, accurate caption describing the key elements or subjects in the image.
2. A confidence score as a float between 0 and 1 that indicates how confident you are about the accuracy of the caption.


Use professional, clear language, and keep the caption brief (under 30 words). Ensure the confidence score reflects your certainty based on the image content and user context.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object matching this exact schema:

```json
{output_schema}
```

IMPORTANT: 
- Ensure all JSON syntax is correct
- Set confidence level based on clarity and consistency of the input data
"""
    return [
      types.Part.from_bytes(
        data=image_bytes,
        mime_type='image/jpeg',
      ),
      prompt
    ]
