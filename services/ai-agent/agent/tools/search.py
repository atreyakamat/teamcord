import os
import requests
from langchain.tools import tool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="The search query to look up on the web")
    num_results: int = Field(default=3, description="Number of results to return")

@tool("web_search", args_schema=SearchInput)
def web_search(query: str, num_results: int = 3) -> str:
    """Searches the web for up-to-date information using SearXNG or a search API."""
    
    searxng_url = os.getenv("SEARXNG_URL", "http://searxng:8080")
    
    try:
        res = requests.get(f"{searxng_url}/search", params={"q": query, "format": "json"})
        res.raise_for_status()
        data = res.json()
        
        results = data.get("results", [])[:num_results]
        if not results:
            return f"No results found for query: {query}"
            
        formatted_results = []
        for r in results:
            title = r.get("title", "No Title")
            url = r.get("url", "#")
            content = r.get("content", "No excerpt available.")
            formatted_results.append(f"- **{title}** ({url}):\n  {content}")
            
        return "\n\n".join(formatted_results)
    except Exception as e:
        return f"Web search failed. Error: {str(e)}"
