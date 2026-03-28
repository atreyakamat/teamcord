/**
 * OllamaClient — communicates with a local Ollama instance for
 * self-hosted LLM inference (community edition).
 *
 * Drop-in compatible with any OpenAI-compatible API (just change baseUrl).
 */

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaStreamChunk {
  model: string;
  message: OllamaMessage;
  done: boolean;
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    baseUrl = process.env["OLLAMA_URL"] ?? "http://localhost:11434",
    model = process.env["OLLAMA_MODEL"] ?? "llama3"
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = model;
  }

  async chat(
    messages: OllamaMessage[],
    opts: OllamaChatOptions = {}
  ): Promise<string> {
    const model = opts.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaStreamChunk;
    return data.message.content;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) return [];
    const data = (await response.json()) as { models: Array<{ name: string }> };
    return data.models.map((m) => m.name);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
