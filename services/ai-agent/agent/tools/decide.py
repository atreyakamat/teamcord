import os
import requests
from typing import Optional, List
from langchain.tools import tool
from pydantic import BaseModel, Field

class DecideInput(BaseModel):
    title: str = Field(description="Title of the decision")
    summary: str = Field(description="Summary of the decision made")
    outcome: str = Field(description="The final outcome or chosen direction")
    channel_id: Optional[str] = Field(None, description="The ID of the channel where the decision occurred")
    alternatives: Optional[List[str]] = Field(default_factory=list, description="List of alternatives considered")

@tool("log_decision", args_schema=DecideInput)
def log_decision(title: str, summary: str, outcome: str, channel_id: str = None, alternatives: list = None) -> str:
    """Logs a confirmed team decision into the workspace's decision log database."""
    # Assuming the messaging service handles the decision log POST endpoint
    api_url = os.getenv("API_URL", "http://messaging:3001/api/v1")
    
    # In a real setup, we extract workspace_id from the context. Using dummy 1 here.
    workspace_id = 1
    
    payload = {
        "workspace_id": workspace_id,
        "title": title,
        "summary": summary,
        "outcome": outcome,
        "alternatives_considered": alternatives or []
    }
    
    if channel_id:
        try:
            payload["channel_id"] = int(channel_id)
        except ValueError:
            pass

    try:
        res = requests.post(f"{api_url}/workspaces/{workspace_id}/decisions", json=payload)
        res.raise_for_status()
        return f"Successfully logged decision: '{title}'"
    except Exception as e:
        return f"Failed to log decision. Error: {str(e)}"
