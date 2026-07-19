import { Head, usePage } from '@inertiajs/react';
import { MessagesSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';
import type { ChatMessage, Conversation } from '@/types/chat';
import { NewChatDialog } from '@/components/chat/new-chat-dialog';
import { NewGroupDialog } from '@/components/chat/new-group-dialog';
import { useEcho, usePresenceChannel, useChannel } from '@laravel/echo-react';
import { chatApi } from '@/lib/chat-api';
import { toast } from 'sonner';

type PageProps = {
    auth: Auth;
    conversations: Conversation[];
    activeConversation: Conversation | null;
    messages: ChatMessage[] | null;
};

export default function ChatIndex() {
    const { props } = usePage<PageProps>();
    const me = props.auth.user;

    const [conversations, setConversations] = useState<Conversation[]>(
        props.conversations,
    );
    const [dialog, setDialog] = useState<
        'chat' | 'group' | 'info' | 'search' | null
    >(null);

    const activeId = props.activeConversation?.id ?? null;
    
    // ── Sync server props into local state ─────────────────────────────
    // Adjusted during render (not in an effect) so there's no flash of
    // stale state — see react.dev "You Might Not Need an Effect".
    const [prevConversationsProp, setPrevConversationsProp] = useState(
        props.conversations,
    );
    const [typingByConversation, setTypingByConversation] = useState<Record<string, string[]>>({});
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

    if (prevConversationsProp !== props.conversations) {
        setPrevConversationsProp(props.conversations);
        setConversations(props.conversations);
    }

    const { channel: presenceChannel } = usePresenceChannel('online');

    useEffect(() => {
        const ch = presenceChannel();
        if (!ch) return;

        ch.here((users: any[]) => {
            setOnlineIds(new Set(users.map((u) => u.id)));
        })
        .joining((user: any) => {
            setOnlineIds((prev) => {
                const next = new Set(prev);
                next.add(user.id);
                return next;
            });
        })
        .leaving((user: any) => {
            setOnlineIds((prev) => {
                const next = new Set(prev);
                next.delete(user.id);
                return next;
            });
        });
    }, [presenceChannel]);

    useEffect(() => {
        if (activeId) {
            chatApi.post(`/chat/${activeId}/read`).catch(console.error);
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeId ? { ...c, unread_count: 0 } : c
                )
            );
        }
    }, [activeId]);

    useEcho(`user.${me.id}`, 'ConversationRead', (e: any) => {
        setConversations((prev) => {
            return prev.map((c) => {
                if (c.id === e.conversationId) {
                    const updatedParticipants = c.participants.map((p) => {
                        if (p.id === e.userId) {
                            return { ...p, last_read_at: e.lastReadAt, last_delivered_at: e.lastReadAt };
                        }
                        return p;
                    });
                    return {
                        ...c,
                        participants: updatedParticipants,
                        unread_count: e.userId === me.id ? 0 : c.unread_count,
                    };
                }
                return c;
            });
        });
    }, [me.id]);

    useEcho(`user.${me.id}`, 'ConversationDelivered', (e: any) => {
        setConversations((prev) => {
            return prev.map((c) => {
                if (c.id === e.conversationId) {
                    const updatedParticipants = c.participants.map((p) => {
                        if (p.id === e.userId) {
                            return { ...p, last_delivered_at: e.lastDeliveredAt };
                        }
                        return p;
                    });
                    return {
                        ...c,
                        participants: updatedParticipants,
                    };
                }
                return c;
            });
        });
    }, [me.id]);

    useEcho(`user.${me.id}`, 'MessageSent', (e: any) => {
        if (e.conversation && e.message) {
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === e.conversation.id);
                if (idx !== -1) {
                    const updated = [...prev];
                    
                    // If it's not the active conversation, increment unread count manually
                    const isNotActive = activeId !== e.conversation.id;
                    const currentUnread = prev[idx].unread_count ?? 0;
                    
                    updated[idx] = { 
                        ...prev[idx], 
                        last_message: e.conversation.last_message,
                        last_message_at: e.conversation.last_message_at,
                        unread_count: isNotActive && e.message.user_id !== me.id 
                            ? currentUnread + 1 
                            : prev[idx].unread_count
                    };

                    // Move to top
                    const [moved] = updated.splice(idx, 1);
                    updated.unshift(moved);
                    return updated;
                }
                return [
                    {
                        ...e.conversation,
                        unread_count: e.message.user_id !== me.id ? 1 : 0
                    },
                    ...prev
                ];
            });

            // Automatically mark received message as read/delivered
            if (e.message.user_id !== me.id) {
                if (activeId === e.message.conversation_id) {
                    chatApi.post(`/chat/${e.message.conversation_id}/read`).catch(console.error);
                } else {
                    chatApi.post(`/chat/${e.message.conversation_id}/delivered`).catch(console.error);

                    const senderName = e.message.sender?.name ?? 'New Message';
                    const messageBody = e.message.body ?? (e.message.type === 'image' ? '📷 Photo' : '📎 File');

                    toast(
                        <div className="flex items-center gap-3">
                            <ChatAvatar
                                name={senderName}
                                avatarUrl={e.message.sender?.avatar_url ?? null}
                                className="size-9"
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-foreground truncate">{senderName}</span>
                                <span className="text-xs text-muted-foreground truncate">{messageBody}</span>
                            </div>
                        </div>,
                        {
                            duration: 5000,
                            position: 'bottom-right',
                        }
                    );
                }
            }
        }
    }, [me.id, activeId]);

    const activeConversation = conversations.find((c) => c.id === activeId) ?? props.activeConversation;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Head title="Chat" />

            {conversations.map((c) => (
                <ConversationSubscription
                    key={c.id}
                    conversationId={c.id}
                    meId={me.id}
                    onTyping={(names) => {
                        setTypingByConversation((prev) => {
                            if (names.length === 0 && !prev[c.id]) return prev;
                            return { ...prev, [c.id]: names };
                        });
                    }}
                />
            ))}

            <div
                className={cn(
                    'h-full w-full md:w-auto',
                    activeConversation && 'hidden md:block',
                )}
            >
                <ChatSidebar
                    conversations={conversations}
                    activeId={activeId}
                    meId={me.id}
                    onlineIds={onlineIds}
                    typingByConversation={typingByConversation}
                    onNewChat={() => setDialog('chat')}
                    onNewGroup={() => setDialog('group')}
                    onSearch={() => setDialog('search')}
                />
            </div>

            {activeConversation ? (
                <div className={cn('min-w-0 flex-1 md:flex', !activeConversation && 'hidden')}>
                    <ChatWindow
                        conversation={activeConversation}
                        messages={props.messages ?? []}
                        meId={me.id}
                        meName={me.name}
                        onlineIds={onlineIds}
                        typingNames={typingByConversation[activeConversation.id] ?? []}
                    />
                </div>
            ) : (
                <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-muted/20 text-muted-foreground md:flex">
                    <MessagesSquare className="size-16 opacity-30" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm">or start a new one from the sidebar.</p>
                </div>
            )}
            
            <NewChatDialog
                open={dialog === 'chat'}
                onOpenChange={(o) => setDialog(o ? 'chat' : null)}
            />
            <NewGroupDialog
                open={dialog === 'group'}
                onOpenChange={(o) => setDialog(o ? 'group' : null)}
            />
        </div>
    );
}

function ConversationSubscription({
    conversationId,
    meId,
    onTyping,
}: {
    conversationId: string;
    meId: string;
    onTyping: (names: string[]) => void;
}) {
    const { channel } = useChannel(`chat.${conversationId}`);
    const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timeout: NodeJS.Timeout }>>({});

    useEffect(() => {
        const ch = channel();
        if (!ch) return;

        const handleTyping = (e: { id: string; name: string }) => {
            if (e.id === meId) return;

            setTypingUsers((prev) => {
                const current = { ...prev };
                if (current[e.id]?.timeout) {
                    clearTimeout(current[e.id].timeout);
                }
                current[e.id] = {
                    name: e.name,
                    timeout: setTimeout(() => {
                        setTypingUsers((p) => {
                            const next = { ...p };
                            delete next[e.id];
                            return next;
                        });
                    }, 3000),
                };
                return current;
            });
        };

        (ch as any).listenForWhisper('typing', handleTyping);

        return () => {
            (ch as any).stopListeningForWhisper('typing');
            setTypingUsers((prev) => {
                Object.values(prev).forEach((t) => clearTimeout(t.timeout));
                return {};
            });
        };
    }, [channel, meId]);

    useEffect(() => {
        onTyping(Object.values(typingUsers).map((u) => u.name));
    }, [typingUsers]);

    return null;
}

