import type { AgentMessage, AgentContext, Message, Decision } from "@teamcord/types";
import { OllamaClient } from "../ollama-client.js";

/**
 * Built-in tools that the agent can use in the community edition.
 * These are inspired by OpenClaw-style tooling — lightweight, composable,
 * and runnable without any external API keys.
 */

export interface Tool {
  name: string;
  description: string;
  execute: (args: unknown, context: AgentContext) => Promise<string>;
}

// ─── Tool: Summarize recent messages ─────────────────────────────────────────

export const summarizeTool: Tool = {
  name: "summarize_channel",
  description:
    "Summarizes the recent messages in the current channel to give a quick TL;DR.",
  async execute(_args, context) {
    const msgs = context.recentMessages ?? [];
    if (msgs.length === 0) return "No recent messages to summarize.";

    const formatted = msgs
      .slice(-20)
      .map((m: Message) => `[${m.authorId}]: ${m.content}`)
      .join("\n");

    return `Recent activity (last ${msgs.length} messages):\n${formatted}`;
  },
};

// ─── Tool: List decisions ─────────────────────────────────────────────────────

export const listDecisionsTool: Tool = {
  name: "list_decisions",
  description:
    "Lists logged decisions from the Decision Log for the workspace.",
  async execute(_args, context) {
    const decisions = context.decisions ?? [];
    if (decisions.length === 0) return "No decisions logged yet.";

    return decisions
      .map(
        (d: Decision) =>
          `• **${d.title}** (${new Date(d.createdAt).toLocaleDateString()})\n  ${d.summary}`
      )
      .join("\n\n");
  },
};

// ─── Tool: Draft a decision ───────────────────────────────────────────────────

export const draftDecisionTool: Tool = {
  name: "draft_decision",
  description:
    "Drafts a decision summary from recent conversation context to post to the Decision Log.",
  async execute(_args, context) {
    const msgs = context.recentMessages ?? [];
    if (msgs.length === 0) return "Not enough context to draft a decision.";

    // Build a minimal prompt for the LLM to extract a decision
    return msgs
      .slice(-10)
      .map((m: Message) => `${m.authorId}: ${m.content}`)
      .join("\n");
  },
};

// ─── Tool registry ────────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [summarizeTool, listDecisionsTool, draftDecisionTool];

export function getTool(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name);
}

// ─── Agent executor ───────────────────────────────────────────────────────────

export class AgentExecutor {
  private llm: OllamaClient;

  constructor(llm: OllamaClient) {
    this.llm = llm;
  }

  async run(
    messages: AgentMessage[],
    context: AgentContext
  ): Promise<{ reply: string; toolsUsed: string[] }> {
    const toolsUsed: string[] = [];

    // System prompt describing the agent's role and tools
    const systemPrompt = `You are TeamCord Agent — an AI assistant embedded in a team communication platform.
You help teams stay organized by summarizing conversations, logging decisions, and surfacing relevant context.

Available tools:
${TOOLS.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

When a user asks you to use a tool, call it explicitly by mentioning its name.
Always be concise and professional. You are working with a team, not a gaming community.
Current channel: ${context.channelInfo?.name ?? "unknown"}`;

    const ollamaMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    // Check if the user wants a specific tool
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    for (const tool of TOOLS) {
      if (lastUserMsg.toLowerCase().includes(tool.name.replace(/_/g, " "))) {
        const toolResult = await tool.execute({}, context);
        toolsUsed.push(tool.name);

        // Inject tool result into the conversation
        ollamaMessages.push({
          role: "assistant",
          content: `[Tool: ${tool.name}]\n${toolResult}`,
        });
        ollamaMessages.push({
          role: "user",
          content: "Please provide a response based on the above tool output.",
        });
      }
    }

    const reply = await this.llm.chat(ollamaMessages, { temperature: 0.6 });

    return { reply, toolsUsed };
  }
}
