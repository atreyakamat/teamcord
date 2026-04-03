import { Loader2, MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, readApiData, readApiError } from '../../lib/api'
import { normalizeChannel, normalizeUser } from '../../lib/normalizers'
import { useAuthStore } from '../../stores/auth'
import { useChannelStore, type Channel } from '../../stores/channels'

interface WorkspaceMember {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  status: string
  role?: string
}

const MemberList = () => {
  const currentUser = useAuthStore((state) => state.user)
  const selectedWorkspaceId = useChannelStore((state) => state.selectedWorkspaceId)
  const addChannel = useChannelStore((state) => state.addChannel)
  const setSelectedChannel = useChannelStore((state) => state.setSelectedChannel)

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setMembers([])
      return
    }

    let ignore = false
    setLoading(true)
    setError('')

    apiFetch(`/api/v1/workspaces/${selectedWorkspaceId}/members`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response))
        }

        const data = await readApiData<Record<string, unknown>[]>(response)
        if (ignore) {
          return
        }

        const nextMembers = (data || [])
          .map((rawMember) => {
            const member = normalizeUser(rawMember)
            if (!member) {
              return null
            }

            return {
              id: member.id,
              username: member.username,
              displayName: member.displayName,
              avatarUrl: member.avatarUrl,
              status: member.status,
              role: typeof rawMember.role === 'string' ? rawMember.role : 'Member',
            } satisfies WorkspaceMember
          })
          .filter(Boolean) as WorkspaceMember[]

        setMembers(nextMembers)
      })
      .catch((fetchError) => {
        if (!ignore) {
          console.error('Failed to fetch workspace members:', fetchError)
          setError('We could not load the workspace roster yet.')
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedWorkspaceId])

  const handleStartDm = async (member: WorkspaceMember) => {
    if (!selectedWorkspaceId || member.id === currentUser?.id) {
      return
    }

    try {
      setActiveMemberId(member.id)
      const response = await apiFetch(`/api/v1/workspaces/${selectedWorkspaceId}/dms`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId: Number(member.id) }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const data = await readApiData<Record<string, unknown>>(response)
      const channel = normalizeChannel(data) as Channel
      addChannel(channel)
      setSelectedChannel(channel.id)
    } catch (createError) {
      console.error('Failed to create direct message:', createError)
      setError('We could not open that direct message just yet.')
    } finally {
      setActiveMemberId(null)
    }
  }

  const onlineMembers = members.filter((member) => member.status !== 'offline')
  const offlineMembers = members.filter((member) => member.status === 'offline')

  return (
    <div className="flex w-[240px] flex-col bg-dc-secondary">
      <div className="border-b border-dc-tertiary px-4 py-3">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-dc-muted">Members</div>
        <div className="mt-1 text-xs text-dc-muted">Click a teammate to open a DM.</div>
      </div>

      <div className="flex-grow space-y-4 overflow-y-auto px-2 py-3">
        {loading && (
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-dc-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading roster...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[rgba(237,66,69,0.3)] bg-[rgba(237,66,69,0.08)] px-3 py-3 text-sm text-[#f7b4b5]">
            {error}
          </div>
        )}

        {!loading && members.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-dc-border bg-[rgba(30,31,34,0.6)] px-3 py-4 text-sm text-dc-muted">
            No members are visible in this workspace yet.
          </div>
        )}

        {onlineMembers.length > 0 && (
          <section>
            <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted">
              Online - {onlineMembers.length}
            </div>
            <div className="space-y-[2px]">
              {onlineMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  busy={activeMemberId === member.id}
                  canMessage={member.id !== currentUser?.id}
                  onClick={() => handleStartDm(member)}
                />
              ))}
            </div>
          </section>
        )}

        {offlineMembers.length > 0 && (
          <section>
            <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted">
              Offline - {offlineMembers.length}
            </div>
            <div className="space-y-[2px] opacity-50">
              {offlineMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  busy={activeMemberId === member.id}
                  canMessage={member.id !== currentUser?.id}
                  onClick={() => handleStartDm(member)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface MemberRowProps {
  member: WorkspaceMember
  canMessage: boolean
  busy: boolean
  onClick: () => void
}

const MemberRow = ({ member, canMessage, busy, onClick }: MemberRowProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canMessage || busy}
      className="group flex w-full items-center rounded px-2 py-1 text-left transition hover:bg-dc-hover disabled:cursor-default disabled:hover:bg-transparent"
    >
      <div className="relative mr-3">
        <img
          src={member.avatarUrl || `https://api.dicebear.com/8.x/avataaars/svg?seed=${member.username}`}
          className="h-8 w-8 rounded-full"
          alt={member.displayName}
        />
        <div
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dc-secondary ${
            member.status === 'online' ? 'bg-dc-green' : 'bg-[#747f8d]'
          }`}
        />
      </div>

      <div className="flex flex-col truncate leading-tight">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate font-medium" style={{ color: 'var(--dc-text-normal)' }}>
            {member.displayName}
          </span>
          {canMessage && (
            <span className="rounded bg-[rgba(88,101,242,0.18)] px-1.5 py-[2px] text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8c2ff]">
              DM
            </span>
          )}
        </div>
        <span className="truncate text-[11px] text-dc-muted">{member.role || 'Member'}</span>
      </div>

      <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-dc-muted transition group-hover:bg-dc-hover group-hover:text-dc-normal">
        {busy ? <Loader2 size={15} className="animate-spin" /> : canMessage ? <MessageSquareText size={15} /> : null}
      </div>
    </button>
  )
}

export default MemberList
