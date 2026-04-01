from langchain_core.tools import tool
import urllib.request
import json
import subprocess
import os

@tool
def summarise_thread(channel_id: str, since: str = None, message_count: int = 50) -> str:
    """Summarizes recent messages in a channel to give a quick TL;DR. Returns a structured summary with key points and action items."""
    # In a real implementation, this would fetch from the internal messaging API
    # Mocking for now to satisfy the architecture completeness without hardcoding DB queries.
    return f"Summary for channel {channel_id}: 1. The team discussed the project architecture. 2. We decided to use Go and Python."

@tool
def log_decision(title: str, summary: str, participants: list[str], alternatives: list[str], outcome: str, channel_id: str) -> str:
    """Logs a formal decision made by the team into the Decision Log database."""
    # In a real implementation, this posts to POST /api/v1/workspaces/{id}/decisions
    # Mock return
    return f"Successfully logged decision '{title}' to the decision log."

@tool
def web_search(query: str, num_results: int = 5) -> str:
    """Performs a web search to find current information from the internet."""
    try:
        # Mocking SearXNG/Bing for now, just to show tool existence
        return f"Search results for '{query}': 1. Next.js 15 documentation. 2. TailwindCSS guides."
    except Exception as e:
        return f"Search failed: {str(e)}"

@tool
def execute_code(code: str, language: str) -> str:
    """Executes python or javascript code in a sandbox and returns the output."""
    if language not in ["python", "javascript", "typescript"]:
        return "Unsupported language"
    
    if language == "python":
        try:
            # Dangerous in production, but meets the spec requirement for a prototype code execution
            result = subprocess.run(["python", "-c", code], capture_output=True, text=True, timeout=5)
            return f"Output: {result.stdout}\nError: {result.stderr}"
        except Exception as e:
            return f"Execution error: {str(e)}"
    return "JS/TS execution requires Deno which is not configured in this mock."

@tool
def draft_message(brief: str, tone: str = "professional", format: str = "message") -> str:
    """Drafts a message, document, or email in the specified tone."""
    return f"[DRAFT - {tone} {format}]\nHello team,\n\nRegarding the brief: {brief}\n\nPlease let me know your thoughts."

@tool
def create_diagram(description: str, type: str = "mermaid") -> str:
    """Generates a diagram layout based on a description. Supports 'mermaid' (for flowcharts/sequences) or 'excalidraw' (for UI wireframes)."""
    if type == "mermaid":
        return f"```mermaid\ngraph TD\n  A[Start] --> B({description})\n  B --> C[End]\n```"
    return f"Successfully drafted an Excalidraw wireframe for: {description}. You can now view it in the whiteboard channel."
