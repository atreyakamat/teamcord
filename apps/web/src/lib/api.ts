const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as any).message ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: {
      email: string;
      username: string;
      displayName: string;
      password: string;
    }) =>
      request<{ data: { token: string; user: import("@teamcord/types").User } }>(
        "/api/v1/auth/register",
        { method: "POST", body: data }
      ),

    login: (data: { email: string; password: string }) =>
      request<{ data: { token: string; user: import("@teamcord/types").User } }>(
        "/api/v1/auth/login",
        { method: "POST", body: data }
      ),

    me: (token: string) =>
      request<{ data: import("@teamcord/types").User }>("/api/v1/auth/me", {
        token,
      }),
  },

  workspaces: {
    list: (token: string) =>
      request<{ data: import("@teamcord/types").Workspace[] }>(
        "/api/v1/workspaces",
        { token }
      ),
    create: (
      token: string,
      data: { name: string; slug: string }
    ) =>
      request<{ data: import("@teamcord/types").Workspace }>(
        "/api/v1/workspaces",
        { method: "POST", body: data, token }
      ),
    get: (token: string, id: string) =>
      request<{ data: import("@teamcord/types").Workspace }>(
        `/api/v1/workspaces/${id}`,
        { token }
      ),
  },

  channels: {
    list: (token: string, workspaceId: string) =>
      request<{ data: import("@teamcord/types").Channel[] }>(
        `/api/v1/channels?workspaceId=${workspaceId}`,
        { token }
      ),
    create: (
      token: string,
      data: {
        workspaceId: string;
        name: string;
        description?: string;
        type?: string;
        isPrivate?: boolean;
        isClientVisible?: boolean;
      }
    ) =>
      request<{ data: import("@teamcord/types").Channel }>(
        "/api/v1/channels",
        { method: "POST", body: data, token }
      ),
  },

  messages: {
    list: (token: string, channelId: string, limit = 50) =>
      request<{ data: import("@teamcord/types").Message[] }>(
        `/api/v1/messages/${channelId}?limit=${limit}`,
        { token }
      ),
    send: (
      token: string,
      channelId: string,
      data: { content: string; replyToId?: string }
    ) =>
      request<{ data: import("@teamcord/types").Message }>(
        `/api/v1/messages/${channelId}`,
        { method: "POST", body: data, token }
      ),
  },

  search: {
    query: (token: string, params: import("@teamcord/types").SearchQuery) => {
      const qs = new URLSearchParams({
        q: params.q,
        workspaceId: params.workspaceId,
        limit: String(params.limit ?? 20),
        offset: String(params.offset ?? 0),
      }).toString();
      return request<{ data: import("@teamcord/types").SearchResult[] }>(
        `/api/v1/search?${qs}`,
        { token }
      );
    },
  },

  decisions: {
    list: (token: string, workspaceId: string) =>
      request<{ data: import("@teamcord/types").Decision[] }>(
        `/api/v1/decisions?workspaceId=${workspaceId}`,
        { token }
      ),
    create: (
      token: string,
      data: {
        workspaceId: string;
        channelId: string;
        messageId: string;
        title: string;
        summary: string;
        decidedBy: string[];
        tags?: string[];
      }
    ) =>
      request<{ data: import("@teamcord/types").Decision }>(
        "/api/v1/decisions",
        { method: "POST", body: data, token }
      ),
  },

  agent: {
    chat: (data: import("@teamcord/types").AgentRequest) => {
      const agentUrl =
        process.env["NEXT_PUBLIC_AGENT_URL"] ?? "http://localhost:3003";
      return fetch(`${agentUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json() as Promise<{ data: import("@teamcord/types").AgentResponse }>);
    },
  },
};
