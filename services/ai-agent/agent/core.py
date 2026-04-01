import os
import json
import asyncio
<<<<<<< HEAD
from langchain_ollama import ChatOllama
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from agent.tools.tools import summarise_thread, log_decision, web_search, execute_code, draft_message
=======
from datetime import datetime
from typing import Optional, List, Dict, Any
from langchain_community.llms import Ollama
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, SystemMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.callbacks.base import AsyncCallbackHandler

# Import all tools
from agent.tools.decide import log_decision
from agent.tools.search import web_search
from agent.tools.summarise import summarise_thread as summarise_tool, generate_wiki
from agent.tools.execute import execute_code, calculate


class StreamingCallback(AsyncCallbackHandler):
    """Callback handler for streaming tokens to SSE clients."""
    
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        await self.queue.put({"type": "token", "content": token})
    
    async def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs) -> None:
        tool_name = serialized.get("name", "unknown")
        await self.queue.put({"type": "tool_start", "tool": tool_name, "input": input_str})
    
    async def on_tool_end(self, output: str, **kwargs) -> None:
        await self.queue.put({"type": "tool_end", "output": output[:500]})


class TeamCordAgent:
    """
    TeamCord AI Agent with full tool support.
    
    Community Edition: Uses Ollama (local LLM)
    Plus/Pro Edition: Uses Claude API with full tool calling
    """
    
    SYSTEM_PROMPT = """You are TeamCord AI, the built-in assistant for a professional team communication platform.

Your capabilities:
- /summarise: Summarize channel or thread discussions
- /decide: Log team decisions to the decision database
- /search: Search the web for information
- /run: Execute JavaScript, TypeScript, or Python code safely
- /wiki: Generate or update channel wiki from resolved threads

Guidelines:
1. Always respond in clear, professional Markdown
2. When logging decisions, confirm the key points with users first
3. For code execution, explain what the code does before running
4. Keep summaries concise but comprehensive
5. When searching, cite sources with links

Current context:
- Channel: {channel_id}
- Workspace: {workspace_id}
- User: {user_name}
- Date: {current_date}
"""
>>>>>>> 611c88264514507555996fa3186df3391f9353bd

    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "ollama")
<<<<<<< HEAD
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
=======
        self.tools = [
            log_decision,
            web_search,
            summarise_tool,
            generate_wiki,
            execute_code,
            calculate,
        ]
        
        if self.provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY required for Anthropic provider")
            
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
                api_key=api_key,
                max_tokens=4096,
                streaming=True,
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.SYSTEM_PROMPT),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            agent = create_tool_calling_agent(self.llm, self.tools, prompt)
            self.agent_executor = AgentExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                max_iterations=5,
                handle_parsing_errors=True,
            )
            
        elif self.provider == "openai":
            from langchain_openai import ChatOpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY required for OpenAI provider")
            
            self.llm = ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                api_key=api_key,
                streaming=True,
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.SYSTEM_PROMPT),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            agent = create_tool_calling_agent(self.llm, self.tools, prompt)
            self.agent_executor = AgentExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                max_iterations=5,
            )
            
        else:
            # Ollama (community edition)
            self.llm = Ollama(
                base_url=os.getenv("OLLAMA_URL", "http://ollama:11434"),
                model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            )
            # Ollama doesn't support full tool calling yet, use basic mode
            self.agent_executor = None
    
    def _build_context(self, context: Dict[str, Any]) -> Dict[str, str]:
        """Build context variables for the prompt."""
        return {
            "channel_id": str(context.get("channel_id", "unknown")),
            "workspace_id": str(context.get("workspace_id", "unknown")),
            "user_name": context.get("author", {}).get("username", "User"),
            "current_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
    
    async def invoke(self, prompt: str, context: Dict[str, Any]) -> str:
        """
        Invoke the agent with a prompt and context.
        Returns the response text.
        """
        ctx = self._build_context(context)
        
        if self.agent_executor:
            try:
                # Format system prompt with context
                formatted_input = {
                    "input": prompt,
                    **ctx,
                }
                response = await self.agent_executor.ainvoke(formatted_input)
>>>>>>> 611c88264514507555996fa3186df3391f9353bd
                return response.get("output", "I processed your request.")
            except Exception as e:
                return f"Error: {str(e)}"
        else:
<<<<<<< HEAD
            return "Agent executor not initialized properly."
=======
            # Basic Ollama fallback without tools
            system = self.SYSTEM_PROMPT.format(**ctx)
            full_prompt = f"{system}\n\nUser: {prompt}\n\nAssistant:"
            return self.llm.invoke(full_prompt)
    
    async def invoke_streaming(
        self,
        prompt: str,
        context: Dict[str, Any],
    ) -> asyncio.Queue:
        """
        Invoke the agent with streaming response.
        Returns an async queue that yields events.
        """
        queue: asyncio.Queue = asyncio.Queue()
        ctx = self._build_context(context)
        
        async def _run():
            try:
                if self.agent_executor:
                    callback = StreamingCallback(queue)
                    formatted_input = {"input": prompt, **ctx}
                    response = await self.agent_executor.ainvoke(
                        formatted_input,
                        config={"callbacks": [callback]},
                    )
                    await queue.put({"type": "done", "content": response.get("output", "")})
                else:
                    # Non-streaming fallback for Ollama
                    response = await self.invoke(prompt, context)
                    await queue.put({"type": "done", "content": response})
            except Exception as e:
                await queue.put({"type": "error", "content": str(e)})
            finally:
                await queue.put(None)  # Signal end
        
        asyncio.create_task(_run())
        return queue
    
    async def handle_command(self, command: str, args: str, context: Dict[str, Any]) -> str:
        """
        Handle slash commands directly.
        """
        if command == "/summarise" or command == "/summarize":
            return await self._summarise(args, context)
        elif command == "/decide":
            return await self._decide(args, context)
        elif command == "/search":
            return await self._search(args, context)
        elif command == "/run":
            return await self._run_code(args, context)
        elif command == "/wiki":
            return await self._update_wiki(context)
        elif command == "/help":
            return self._help()
        else:
            return await self.invoke(f"{command} {args}", context)
    
    async def _summarise(self, args: str, context: Dict[str, Any]) -> str:
        """Summarize channel/thread messages."""
        channel_id = context.get("channel_id")
        count = 50
        if args:
            try:
                count = int(args.strip())
            except ValueError:
                pass
        
        prompt = f"Please summarize the last {count} messages in this channel. Focus on key decisions, action items, and open questions."
        return await self.invoke(prompt, context)
    
    async def _decide(self, args: str, context: Dict[str, Any]) -> str:
        """Log a decision."""
        if not args:
            return "Please provide a decision to log. Usage: `/decide <title>: <summary>`"
        
        parts = args.split(":", 1)
        title = parts[0].strip()
        summary = parts[1].strip() if len(parts) > 1 else args
        
        prompt = f"""Log the following decision:
        Title: {title}
        Summary: {summary}
        
        Please confirm the decision details and log it using the log_decision tool."""
        return await self.invoke(prompt, context)
    
    async def _search(self, query: str, context: Dict[str, Any]) -> str:
        """Search the web."""
        if not query:
            return "Please provide a search query. Usage: `/search <query>`"
        
        prompt = f"Search the web for: {query}\nProvide a summary of the most relevant results."
        return await self.invoke(prompt, context)
    
    async def _run_code(self, code: str, context: Dict[str, Any]) -> str:
        """Execute code."""
        if not code:
            return "Please provide code to run. Usage: `/run <code>`"
        
        # Detect language
        language = "javascript"
        if code.startswith("```python") or code.startswith("```py"):
            language = "python"
            code = code.replace("```python", "").replace("```py", "").replace("```", "").strip()
        elif code.startswith("```typescript") or code.startswith("```ts"):
            language = "typescript"
            code = code.replace("```typescript", "").replace("```ts", "").replace("```", "").strip()
        elif code.startswith("```javascript") or code.startswith("```js"):
            code = code.replace("```javascript", "").replace("```js", "").replace("```", "").strip()
        elif code.startswith("```"):
            code = code.replace("```", "").strip()
        
        prompt = f"Execute this {language} code and explain the output:\n```{language}\n{code}\n```"
        return await self.invoke(prompt, context)
    
    async def _update_wiki(self, context: Dict[str, Any]) -> str:
        """Update channel wiki."""
        channel_id = context.get("channel_id")
        prompt = f"Generate or update the wiki page for channel {channel_id} using resolved threads and decisions."
        return await self.invoke(prompt, context)
    
    def _help(self) -> str:
        """Return help text."""
        return """**TeamCord AI Commands**

`/summarise [count]` - Summarize recent channel messages (default: 50)
`/decide <title>: <summary>` - Log a team decision
`/search <query>` - Search the web
`/run <code>` - Execute JavaScript, TypeScript, or Python code
`/wiki` - Update channel wiki from resolved threads

You can also mention @teamcord to ask questions or get help with anything!

Examples:
- `/summarise 100` - Summarize last 100 messages
- `/decide Use PostgreSQL: We chose PostgreSQL for its reliability and JSON support`
- `/search best practices for API design`
- `/run console.log(Math.random())`
"""


# For backwards compatibility
NexusAgent = TeamCordAgent
>>>>>>> 611c88264514507555996fa3186df3391f9353bd
