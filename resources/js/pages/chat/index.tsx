import { Head, usePage } from '@inertiajs/react';
import { MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';
import type { ChatMessage, Conversation } from '@/types/chat';
import { NewChatDialog } from '@/components/chat/new-chat-dialog';

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
                    onlineIds={new Set()}
                    typingByConversation={{}}
                    onNewChat={() => setDialog('chat')}
                    onNewGroup={() => setDialog('group')}
                    onSearch={() => setDialog('search')}
                />
            </div>

            <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-muted/20 text-muted-foreground md:flex">
                <MessagesSquare className="size-16 opacity-30" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">or start a new one from the sidebar.</p>
            </div>
            
            <NewChatDialog
                open={dialog === 'chat'}
                onOpenChange={(o) => setDialog(o ? 'chat' : null)}
            />
        </div>
    );
}

