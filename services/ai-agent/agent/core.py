import os
from langchain_community.llms import Ollama
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage

class NexusAgent:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "ollama")
        if self.provider == "anthropic":
            self.llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", api_key=os.getenv("ANTHROPIC_API_KEY"))
        else:
            self.llm = Ollama(base_url=os.getenv("OLLAMA_URL", "http://ollama:11434"), model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"))

    async def invoke(self, prompt: str, context: dict):
        # Build system prompt with workspace context
        system_prompt = f"""
        You are Nexus, the built-in AI assistant for a professional team communication platform.
        Current channel: {context.get('channel_id')}
        Today's date: {os.popen('date').read().strip()}

        Your goals:
        - Summarise discussions accurately
        - Help with decision making
        - Provide concise, professional answers
        - Format responses with Markdown
        """

        if self.provider == "anthropic":
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            response = await self.llm.ainvoke(messages)
            return response.content
        else:
            # Ollama simple invoke
            full_prompt = f"{system_prompt}\n\nUser: {prompt}\nNexus:"
            return self.llm.invoke(full_prompt)

    async def summarise_thread(self, channel_id: str, messages: list):
        # Implementation for summarization tool
        prompt = f"Summarise the following discussion in channel {channel_id}:\n"
        for m in messages:
            prompt += f"- {m.get('author')}: {m.get('content')}\n"
        
        return await self.invoke(prompt, {"channel_id": channel_id})
