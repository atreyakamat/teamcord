type RecordLike = Record<string, any>

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  return []
}

export function normalizeUser(raw: RecordLike | null | undefined) {
  if (!raw) return null

  return {
    id: String(raw.id ?? ''),
    email: raw.email ?? '',
    username: raw.username ?? '',
    displayName: raw.display_name ?? raw.displayName ?? raw.username ?? 'TeamCord User',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl,
    status: raw.status ?? 'offline',
    customStatus: raw.custom_status ?? raw.customStatus,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    role: raw.role,
  }
}

export function normalizeWorkspace(raw: RecordLike) {
  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? 'Workspace',
    slug: raw.slug ?? '',
    iconUrl: raw.icon_url ?? raw.iconUrl,
    ownerId: String(raw.owner_id ?? raw.ownerId ?? ''),
    plan: raw.plan ?? 'community',
  }
}

export function normalizeChannel(raw: RecordLike) {
  return {
    id: String(raw.id ?? ''),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId ?? ''),
    name: raw.name ?? 'channel',
    description: raw.description ?? raw.topic ?? '',
    type: raw.type ?? 'text',
    isPrivate: Boolean(raw.is_private ?? raw.isPrivate ?? raw.type === 'dm'),
    position: Number(raw.position ?? 0),
    parentId: raw.parent_id != null ? String(raw.parent_id) : raw.parentId != null ? String(raw.parentId) : undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    participantIds: asArray<number | string>(raw.participant_ids ?? raw.participantIds).map((value) => String(value)),
  }
}

export function normalizeReaction(raw: RecordLike) {
  return {
    emoji: raw.emoji ?? raw.emoji_name ?? '',
    emojiId: raw.emoji_id != null ? String(raw.emoji_id) : raw.emojiId != null ? String(raw.emojiId) : undefined,
    emojiAnimated: Boolean(raw.emoji_animated ?? raw.emojiAnimated),
    count: Number(raw.count ?? 0),
    userIds: asArray<number | string>(raw.user_ids ?? raw.userIds).map((value) => String(value)),
    me: Boolean(raw.me),
  }
}

export function normalizeMessage(raw: RecordLike) {
  return {
    id: String(raw.id ?? ''),
    channelId: String(raw.channel_id ?? raw.channelId ?? ''),
    authorId: String(raw.author_id ?? raw.authorId ?? ''),
    content: raw.content ?? '',
    type: raw.type ?? 'text',
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    editedAt: raw.edited_at ?? raw.editedAt,
    edited: Boolean(raw.edited ?? raw.edited_at ?? raw.editedAt),
    replyToId: raw.reference_id != null ? String(raw.reference_id) : raw.replyToId != null ? String(raw.replyToId) : undefined,
    attachments: asArray<RecordLike>(raw.attachments).map((attachment) => ({
      id: String(attachment.id ?? attachment.url ?? crypto.randomUUID?.() ?? `${Date.now()}`),
      url: attachment.url ?? '',
      filename: attachment.filename ?? attachment.name ?? 'attachment',
      mimeType: attachment.mime_type ?? attachment.mimeType ?? 'application/octet-stream',
      size: Number(attachment.size ?? 0),
      width: attachment.width != null ? Number(attachment.width) : undefined,
      height: attachment.height != null ? Number(attachment.height) : undefined,
    })),
    reactions: asArray<RecordLike>(raw.reactions).map(normalizeReaction),
    author: normalizeUser(raw.author) ?? undefined,
    pinned: Boolean(raw.pinned),
  }
}
