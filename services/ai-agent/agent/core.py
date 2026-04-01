import os
import json
import asyncio
import glob
import importlib.util
import inspect
from langchain_ollama import ChatOllama
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from agent.tools.tools import summarise_thread, log_decision, web_search, execute_code, draft_message, create_diagram
from langchain_core.tools import BaseTool

def load_plugins():
    plugins_path = os.path.join(os.path.dirname(__file__), 'plugins')
    if not os.path.exists(plugins_path):
        return []
    
    plugin_tools = []
    for py_file in glob.glob(os.path.join(plugins_path, "*.py")):
        if py_file.endswith("__init__.py"):
            continue
        
        module_name = os.path.splitext(os.path.basename(py_file))[0]
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            for name, obj in inspect.getmembers(module):
                if isinstance(obj, BaseTool):
                    plugin_tools.append(obj)
                    
    return plugin_tools

class NexusAgent:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "ollama")
        self.tools = [summarise_thread, log_decision, web_search, execute_code, draft_message, create_diagram]
        self.tools.extend(load_plugins())
        
        print(f"Agent loaded with tools: {[t.name for t in self.tools]}")
        
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