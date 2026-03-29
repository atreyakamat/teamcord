import os
import json
from langchain_community.llms import Ollama
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, SystemMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from agent.tools.decide import log_decision
from agent.tools.search import web_search

class NexusAgent:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "ollama")
        self.tools = [log_decision, web_search]
        
        if self.provider == "anthropic":
            self.llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", api_key=os.getenv("ANTHROPIC_API_KEY"))
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are Nexus, the built-in AI assistant for a professional team communication platform.\n"
                           "Use the provided tools to assist users. Always format your responses in Markdown."),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            # Create tool calling agent
            agent = create_tool_calling_agent(self.llm, self.tools, prompt)
            self.agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)
            
        else:
            # Fallback to simple Ollama model without full tool calling capabilities for now,
            # or we could use the new Ollama tool calling support in Langchain 0.2
            self.llm = Ollama(base_url=os.getenv("OLLAMA_URL", "http://ollama:11434"), model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"))
            self.agent_executor = None

    async def invoke(self, prompt: str, context: dict):
        system_prompt = f"""
        You are Nexus, the built-in AI assistant for a professional team communication platform.
        Current channel: {context.get('channel_id')}
        Today's date: {os.popen('date').read().strip()}
        """

        if self.agent_executor:
            # Full agentic flow with Anthropic
            try:
                response = await self.agent_executor.ainvoke({"input": prompt})
                return response.get("output", "I processed your request.")
            except Exception as e:
                return f"Error executing agent: {str(e)}"
        else:
            # Basic LLM fallback for community edition (Ollama)
            full_prompt = f"{system_prompt}\n\nUser: {prompt}\nNexus:"
            return self.llm.invoke(full_prompt)

    async def summarise_thread(self, channel_id: str, messages: list):
        prompt = f"Summarise the following discussion in channel {channel_id}:\n"
        for m in messages:
            prompt += f"- {m.get('author')}: {m.get('content')}\n"
        
        return await self.invoke(prompt, {"channel_id": channel_id})
