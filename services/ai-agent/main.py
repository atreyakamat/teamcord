import asyncio
import os
import json
import nats
from fastapi import FastAPI
from agent.core import NexusAgent

app = FastAPI()
agent = NexusAgent()

# Track message counts per channel for proactivity
channel_activity = {}
ACTIVITY_THRESHOLD = 10 # Trigger summary after 10 rapid messages

async def nats_subscriber():
    nc = await nats.connect(os.getenv("NATS_URL", "nats://nats:4222"))
    js = nc.jetstream()

    sub = await js.subscribe("channel.*", durable="ai-agent", queue="ai-agent-group")

    print("AI Agent listening for commands on channel.*")

    while True:
        try:
            msg = await sub.next_msg()
            payload = json.loads(msg.data.decode())
            
            if payload.get("t") == "MESSAGE_CREATE":
                data = payload.get("d", {})
                content = data.get("content", "")
                channel_id = data.get("channel_id")
                author_id = data.get("author_id")
                
                # Ignore own messages
                if author_id == 0:
                    await msg.ack()
                    continue

                # Update channel activity
                if channel_id not in channel_activity:
                    channel_activity[channel_id] = 0
                channel_activity[channel_id] += 1

                triggered = False
                
                if content.startswith("/summarise") or content.startswith("/decide") or "@nexus" in content.lower():
                    print(f"Agent explicitly triggered by: {content}")
                    response = await agent.invoke(content, data)
                    triggered = True
                    # Reset activity on explicit invocation
                    channel_activity[channel_id] = 0
                elif channel_activity[channel_id] >= ACTIVITY_THRESHOLD:
                    print(f"Agent proactively triggered due to high activity in channel {channel_id}")
                    response = await agent.invoke("Please provide a proactive summary of the recent discussion. The team has been talking a lot.", data)
                    triggered = True
                    channel_activity[channel_id] = 0

                if triggered:
                    res_payload = {
                        "op": 0,
                        "t": "MESSAGE_CREATE",
                        "d": {
                            "channel_id": channel_id,
                            "author_id": 0,
                            "content": response,
                            "type": "ai_response"
                        }
                    }
                    await nc.publish(f"channel.{channel_id}", json.dumps(res_payload).encode())

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