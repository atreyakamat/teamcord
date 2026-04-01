import os
import requests
from typing import Optional, List
from langchain.tools import tool
from pydantic import BaseModel, Field

class SummariseInput(BaseModel):
    channel_id: str = Field(description="The channel ID to summarize messages from")
    message_count: int = Field(default=50, description="Number of recent messages to include in summary")
    thread_id: Optional[str] = Field(None, description="Optional thread ID to summarize instead of channel")

@tool("summarise_thread", args_schema=SummariseInput)
def summarise_thread(channel_id: str, message_count: int = 50, thread_id: Optional[str] = None) -> str:
    """
    Summarizes recent messages from a channel or thread into a concise, structured format.
    Returns key points, decisions made, action items, and unresolved questions.
    """
    api_url = os.getenv("API_URL", "http://api:3001/api/v1")
    
    try:
        # Fetch messages
        if thread_id:
            url = f"{api_url}/threads/{thread_id}/messages?limit={message_count}"
        else:
            url = f"{api_url}/channels/{channel_id}/messages?limit={message_count}"
        
        res = requests.get(url, headers={"Authorization": f"Bearer {os.getenv('SERVICE_TOKEN', '')}"})
        res.raise_for_status()
        messages = res.json()
        
        if not messages:
            return "No messages found to summarize."
        
        # Format messages for summarization
        formatted = []
        for msg in messages:
            author = msg.get("author", {}).get("username", "Unknown")
            content = msg.get("content", "")
            timestamp = msg.get("createdAt", "")[:10]  # Just the date
            formatted.append(f"[{timestamp}] {author}: {content}")
        
        conversation = "\n".join(formatted)
        
        # This is a placeholder - actual summarization happens in core.py via LLM
        return f"SUMMARIZE_REQUEST::{channel_id}::{thread_id or 'channel'}::\n{conversation}"
        
    except Exception as e:
        return f"Failed to fetch messages for summarization: {str(e)}"


class AutoWikiInput(BaseModel):
    channel_id: str = Field(description="The channel ID to generate wiki from")
    include_decisions: bool = Field(default=True, description="Include logged decisions in wiki")

@tool("generate_wiki", args_schema=AutoWikiInput)
def generate_wiki(channel_id: str, include_decisions: bool = True) -> str:
    """
    Generates or updates a channel wiki page from resolved threads and logged decisions.
    Creates a structured knowledge base from conversations.
    """
    api_url = os.getenv("API_URL", "http://api:3001/api/v1")
    
    try:
        # Fetch resolved threads
        threads_res = requests.get(
            f"{api_url}/channels/{channel_id}/threads?status=resolved",
            headers={"Authorization": f"Bearer {os.getenv('SERVICE_TOKEN', '')}"}
        )
        threads_res.raise_for_status()
        threads = threads_res.json()
        
        # Fetch channel info
        channel_res = requests.get(
            f"{api_url}/channels/{channel_id}",
            headers={"Authorization": f"Bearer {os.getenv('SERVICE_TOKEN', '')}"}
        )
        channel_res.raise_for_status()
        channel = channel_res.json()
        
        wiki_content = f"# {channel.get('name', 'Channel')} Wiki\n\n"
        wiki_content += "_Auto-generated from resolved threads_\n\n"
        
        if threads:
            wiki_content += "## Resolved Discussions\n\n"
            for thread in threads[:20]:  # Limit to 20 most recent
                wiki_content += f"### {thread.get('name', 'Thread')}\n"
                wiki_content += f"_Created: {thread.get('createdAt', '')[:10]}_\n\n"
                # Would add thread summary here after LLM processing
        
        if include_decisions:
            # Fetch decisions
            workspace_id = channel.get('workspaceId')
            decisions_res = requests.get(
                f"{api_url}/workspaces/{workspace_id}/decisions?channelId={channel_id}",
                headers={"Authorization": f"Bearer {os.getenv('SERVICE_TOKEN', '')}"}
            )
            decisions_res.raise_for_status()
            decisions = decisions_res.json()
            
            if decisions:
                wiki_content += "## Decision Log\n\n"
                for decision in decisions[:10]:
                    wiki_content += f"### {decision.get('title', 'Decision')}\n"
                    wiki_content += f"**Outcome:** {decision.get('outcome', 'N/A')}\n"
                    wiki_content += f"**Summary:** {decision.get('summary', 'N/A')}\n\n"
        
        # Update or create wiki page
        wiki_res = requests.put(
            f"{api_url}/channels/{channel_id}/wiki",
            json={
                "title": f"{channel.get('name', 'Channel')} Wiki",
                "content": wiki_content,
            },
            headers={"Authorization": f"Bearer {os.getenv('SERVICE_TOKEN', '')}"}
        )
        wiki_res.raise_for_status()
        
        return f"Wiki page updated for channel {channel.get('name', channel_id)}"
        
    except Exception as e:
        return f"Failed to generate wiki: {str(e)}"
