import asyncio
import os
import json
import nats
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from agent.core import TeamCordAgent

app = FastAPI(title="TeamCord AI Agent", version="1.0.0")
agent = TeamCordAgent()


class InvokeRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None
    stream: bool = False


class CommandRequest(BaseModel):
    command: str
    args: str = ""
    context: Optional[Dict[str, Any]] = None


@app.post("/invoke")
async def invoke_agent(req: InvokeRequest):
    """Direct REST invocation of the agent."""
    context = req.context or {}
    
    if req.stream:
        async def event_stream():
            queue = await agent.invoke_streaming(req.prompt, context)
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
        
        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        response = await agent.invoke(req.prompt, context)
        return {"response": response}


@app.post("/command")
async def invoke_command(req: CommandRequest):
    """Direct slash command invocation."""
    context = req.context or {}
    response = await agent.handle_command(req.command, req.args, context)
    return {"response": response}


async def nats_subscriber():
    """Subscribe to NATS for channel messages."""
    nats_url = os.getenv("NATS_URL", "nats://nats:4222")
    
    try:
        nc = await nats.connect(nats_url)
        js = nc.jetstream()
        print(f"AI Agent connected to NATS at {nats_url}")
    except Exception as e:
        print(f"Failed to connect to NATS: {e}")
        return

    # Subscribe to all channel messages with queue group for scaling
    try:
        sub = await js.subscribe(
            "channel.*",
            durable="ai-agent",
            queue="ai-agent-group",
        )
    except Exception as e:
        print(f"Failed to subscribe to NATS stream: {e}")
        # Fall back to simple subscription
        sub = await nc.subscribe("channel.*", queue="ai-agent-group")

    print("AI Agent listening for commands on channel.*")

    while True:
        try:
            msg = await sub.next_msg(timeout=60)
            payload = json.loads(msg.data.decode())
            
            # Handle DISPATCH events (op 0)
            if payload.get("op") == 0 and payload.get("t") == "MESSAGE_CREATE":
                await handle_message(nc, payload.get("d", {}))
            
            # Acknowledge the message
            try:
                await msg.ack()
            except:
                pass  # Simple subscription doesn't need ack
                
        except nats.errors.TimeoutError:
            continue  # No message, keep waiting
        except Exception as e:
            print(f"Error processing message: {e}")
            await asyncio.sleep(1)


async def handle_message(nc: nats.NATS, data: Dict[str, Any]):
    """Handle incoming message and respond if it's a command or mention."""
    content = data.get("content", "")
    channel_id = data.get("channel_id")
    author = data.get("author", {})
    
    # Skip bot messages
    if author.get("bot"):
        return
    
    response = None
    
    # Check for slash commands
    if content.startswith("/"):
        parts = content.split(" ", 1)
        command = parts[0]
        args = parts[1] if len(parts) > 1 else ""
        
        valid_commands = ["/summarise", "/summarize", "/decide", "/search", "/run", "/wiki", "/help"]
        if command in valid_commands:
            print(f"Processing command: {command} {args[:50]}...")
            response = await agent.handle_command(command, args, data)
    
    # Check for @teamcord mention
    elif "@teamcord" in content.lower() or "@ai" in content.lower():
        # Remove the mention and process as a query
        query = content.lower().replace("@teamcord", "").replace("@ai", "").strip()
        if query:
            print(f"Processing mention: {query[:50]}...")
            response = await agent.invoke(query, data)
    
    # Send response back via NATS
    if response and channel_id:
        response_payload = {
            "op": 0,
            "t": "MESSAGE_CREATE",
            "d": {
                "channel_id": channel_id,
                "author": {
                    "id": "0",
                    "username": "TeamCord AI",
                    "avatar": None,
                    "bot": True,
                },
                "content": response,
                "type": "ai_response",
                "timestamp": asyncio.get_event_loop().time(),
            }
        }
        
        try:
            await nc.publish(f"channel.{channel_id}", json.dumps(response_payload).encode())
            print(f"Response sent to channel.{channel_id}")
        except Exception as e:
            print(f"Failed to publish response: {e}")


@app.on_event("startup")
async def startup_event():
    """Start NATS subscriber on application startup."""
    asyncio.create_task(nats_subscriber())


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "provider": agent.provider,
        "tools": [t.name for t in agent.tools],
    }


@app.get("/")
async def root():
    """API info."""
    return {
        "name": "TeamCord AI Agent",
        "version": "1.0.0",
        "provider": agent.provider,
        "endpoints": [
            {"path": "/invoke", "method": "POST", "description": "Invoke agent with prompt"},
            {"path": "/command", "method": "POST", "description": "Execute slash command"},
            {"path": "/health", "method": "GET", "description": "Health check"},
        ],
    }
