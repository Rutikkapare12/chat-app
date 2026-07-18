import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BellOff,
    MessageSquarePlus,
    Search,
    Users,
    Check,
    CheckCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { TypingDots, typingLabel } from '@/components/chat/typing-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    conversationDisplay,
    formatSidebarTime,
    lastMessagePreview,
    getLastMessageStatus,
} from '@/lib/chat-utils';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';

export function ChatSidebar({
    conversations,
    activeId,
    meId,
    onlineIds,
    typingByConversation,
    onNewChat,
    onNewGroup,
    onSearch,
}: {
    conversations: Conversation[];
    activeId: number | null;
    meId: number;
    onlineIds: Set<number>;
    typingByConversation: Record<number, string[]>;
    onNewChat: () => void;
    onNewGroup: () => void;
    onSearch: () => void;
}) {
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
        const query = filter.trim().toLowerCase();

        if (!query) {
            return conversations;
        }

        return conversations.filter((c) =>
            conversationDisplay(c, meId).name.toLowerCase().includes(query),
        );
    }, [conversations, filter, meId]);

    return (
        <div className="flex h-full w-full flex-col border-r bg-sidebar md:w-80 lg:w-96">
            <div className="flex items-center justify-between gap-2 border-b p-3">
                <div className='flex items-center gap-1'>
                    <Button
                        variant='ghost'
                        size={'icon'}
                        asChild
                        title='Back to dashboard'
                    >
                        <Link href="/dashboard">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <h1 className='text-lg font-semibold'>Chats</h1>
                </div>
                <div className='flex items-center gap-1'>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSearch}
                        title="Search messages"
                    >
                        <Search className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNewGroup}
                        title="New group"
                    >
                        <Users className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNewChat}
                        title="New chat"
                    >
                        <MessageSquarePlus className="size-4" />
                    </Button>
                </div>
            </div>

            <div className='p-3 pb-2'>
                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search or start a new chat"
                    className="h-9"
                />
            </div>

            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                        No conversations yet. Start one with the{' '}
                        <MessageSquarePlus className="inline size-4" /> button.
                    </p>
                )}

                    {filtered.map((conversation) => {
                    const display = conversationDisplay(conversation, meId);
                    const typing = typingLabel(
                        typingByConversation[conversation.id] ?? [],
                    );
                    const online =
                        conversation.type === 'direct' &&
                        !!display.otherUser &&
                        onlineIds.has(display.otherUser.id);
                    const unread = conversation.unread_count ?? 0;
                        return (
                            <Link
                                key={conversation.id}
                                href={`/chat/${conversation.id}`}
                                preserveState
                                preserveScroll
                                className={cn(
                                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50',
                                    activeId === conversation.id && 'bg-accent',
                                )}
                            >
                            <ChatAvatar
                                name={display.name}
                                avatarUrl={display.avatarUrl}
                                isGroup={conversation.type === 'group'}
                                online={online}
                                className="size-11"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="truncate font-medium">
                                        {display.name}
                                    </span>
                                    {conversation.last_message_at && (
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs',
                                                unread > 0
                                                    ? 'font-semibold text-primary'
                                                    : 'text-muted-foreground',
                                            )}
                                            suppressHydrationWarning
                                        >
                                            {formatSidebarTime(
                                                conversation.last_message_at,
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    {typing ? (
                                        <span className="flex items-center gap-1.5 truncate text-sm text-primary">
                                            {typing} <TypingDots />
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-1 min-w-0 flex-1 text-sm text-muted-foreground">
                                            {getLastMessageStatus(conversation, meId) && (
                                                <SidebarMessageStatusIcon status={getLastMessageStatus(conversation, meId)!} />
                                            )}
                                            <span className="truncate">
                                                {lastMessagePreview(
                                                    conversation.last_message,
                                                    meId,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                     <span className="flex shrink-0 items-center gap-1">
                                        {conversation.muted && (
                                            <BellOff className="size-3.5 text-muted-foreground" />
                                        )}
                                        {unread > 0 && (
                                            <Badge className="h-5 min-w-5 rounded-full px-1.5 text-xs">
                                                {unread > 99 ? '99+' : unread}
                                            </Badge>
                                        )}
                                    </span>
                                </div>
                                   
                            </div>
                        </Link>
                        );
                    })}
            </div>
        </div>
    );
}

function SidebarMessageStatusIcon({ status }: { status: 'sending' | 'sent' | 'delivered' | 'seen' }) {
    if (status === 'seen') {
        return <CheckCheck className="size-3.5 text-sky-500 shrink-0" />;
    }
    if (status === 'delivered') {
        return <CheckCheck className="size-3.5 text-muted-foreground shrink-0" />;
    }
    return <Check className="size-3.5 text-muted-foreground shrink-0" />;
}