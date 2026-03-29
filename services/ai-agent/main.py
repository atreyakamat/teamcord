import asyncio
import os
import json
import nats
from fastapi import FastAPI
from agent.core import NexusAgent

app = FastAPI()
agent = NexusAgent()

async def nats_subscriber():
    nc = await nats.connect(os.getenv("NATS_URL", "nats://nats:4222"))
    js = nc.jetstream()

    # Subscribe to all channel messages
    # Use a queue group for horizontal scaling
    sub = await js.subscribe("channel.*", durable="ai-agent", queue="ai-agent-group")

    print("AI Agent listening for commands on channel.*")

    while True:
        try:
            msg = await sub.next_msg()
            payload = json.loads(msg.data.decode())
            
            # Op 0 is DISPATCH, t is event type
            if payload.get("t") == "MESSAGE_CREATE":
                data = payload.get("d", {})
                content = data.get("content", "")
                
                # Check for commands or mentions
                if content.startswith("/summarise") or content.startswith("/decide") or "@nexus" in content.lower():
                    # Handle command
                    print(f"Agent triggered by: {content}")
                    response = await agent.invoke(content, data)
                    
                    # Publish response back to NATS
                    res_payload = {
                        "op": 0,
                        "t": "MESSAGE_CREATE",
                        "d": {
                            "channel_id": data.get("channel_id"),
                            "author_id": 0, # Agent author
                            "content": response,
                            "type": "ai_response"
                        }
                    }
                    await nc.publish(f"channel.{data.get('channel_id')}", json.dumps(res_payload).encode())

            await msg.ack()
        except Exception as e:
            print(f"Error in subscriber loop: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_all_tasks([nats_subscriber()])

@app.get("/health")
async def health():
    return {"status": "healthy"}
