import requests

def is_valid_url(url, timeout=10):
    """
    Checks if a URL is reachable and returns HTTP 200 OK.

    Args:
        url (str): The URL to check.
        timeout (int): Request timeout in seconds.

    Returns:
        bool: True if the URL is reachable and valid, False otherwise.
    """
    try:
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        return False
    

if __name__ == "__main__":
    urls = [
        "https://www.bbc.com",
        "https://invalid.example.com",
        "https://httpstat.us/404", 
        "https://www.dailypioneer.com/uploads/2025/epaper/july/delhi-english-edition-2025-07-25.pdf", 
        "https://www.vialytics.com/blog/dangersofpotholes"
    ]

    for url in urls:
        print(f"{url} => {'Valid' if is_valid_url(url) else 'Invalid'}")
