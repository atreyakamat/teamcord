import os
import json
import asyncio
from langchain_ollama import ChatOllama
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from agent.tools.tools import summarise_thread, log_decision, web_search, execute_code, draft_message

class NexusAgent:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "ollama")
        self.tools = [summarise_thread, log_decision, web_search, execute_code, draft_message]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are Nexus, the built-in AI assistant for a professional team communication platform.\n"
                       "Use the provided tools to assist users. Always format your responses in Markdown.\n"
                       "Do not output internal thoughts, just answer the user directly and use tools when needed."),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        if self.provider == "anthropic":
            self.llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", api_key=os.getenv("ANTHROPIC_API_KEY"))
        else:
            # Using ChatOllama which supports tool calling in recent versions
            self.llm = ChatOllama(
                base_url=os.getenv("OLLAMA_URL", "http://ollama:11434"),
                model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
                temperature=0.3
            )
            
        try:
            agent = create_tool_calling_agent(self.llm, self.tools, prompt)
            self.agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True, handle_parsing_errors=True)
        except Exception as e:
            print(f"Failed to create tool calling agent: {e}")
            self.agent_executor = None

    async def invoke(self, prompt: str, context: dict):
        system_prompt = f"""
        Current channel ID: {context.get('channel_id')}
        """
        full_prompt = f"{system_prompt}\nUser request: {prompt}"

        if self.agent_executor:
            try:
                response = await self.agent_executor.ainvoke({"input": full_prompt})
                return response.get("output", "I processed your request.")
            except Exception as e:
                return f"Error executing agent: {str(e)}"
        else:
            return "Agent executor not initialized properly."
