import { Head, usePage } from '@inertiajs/react';
import { MessagesSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';
import type { ChatMessage, Conversation } from '@/types/chat';
import { NewChatDialog } from '@/components/chat/new-chat-dialog';
import { useEcho } from '@laravel/echo-react';

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
    const activeConversation = props.activeConversation;

    // ── Sync server props into local state ─────────────────────────────
    // Adjusted during render (not in an effect) so there's no flash of
    // stale state — see react.dev "You Might Not Need an Effect".
    const [prevConversationsProp, setPrevConversationsProp] = useState(
        props.conversations,
    );

    if (prevConversationsProp !== props.conversations) {
        setPrevConversationsProp(props.conversations);
        setConversations(props.conversations);
    }

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
                return [e.conversation, ...prev];
            });
        }
    }, [me.id, activeId]);

    const onlineIds = new Set<number>();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Head title="Chat" />

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
                    typingByConversation={{}}
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
                        onlineIds={onlineIds}
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
        </div>
    );
}

