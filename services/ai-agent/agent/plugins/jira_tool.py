from langchain_core.tools import tool

@tool
def get_jira_ticket(ticket_id: str) -> str:
    """Fetches details for a specific Jira ticket by its ID (e.g. NEX-123)."""
    # In a real implementation, this would call the Jira REST API
    return f"Jira Ticket {ticket_id}: 'Implement E2EE encryption for DMs'. Status: In Progress. Assignee: Atreya."

@tool
def create_jira_ticket(title: str, description: str) -> str:
    """Creates a new Jira ticket with the given title and description."""
    return f"Successfully created Jira ticket 'NEX-999' for '{title}'."
