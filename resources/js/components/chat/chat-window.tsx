import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
    Send,
    Smile,
    Paperclip,
    MoreVertical,
    ArrowLeft,
    Check,
    CheckCheck,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import {
    conversationDisplay,
    formatClock,
    getMessageStatus,
} from '@/lib/chat-utils';
import { cn } from '@/lib/utils';
import type { ChatMessage, Conversation } from '@/types/chat';
import { router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { TypingDots, typingLabel } from './typing-indicator';

export function ChatWindow({
    conversation,
    messages,
    meId,
    meName,
    onlineIds,
    typingNames = [],
}: {
    conversation: Conversation;
    messages: ChatMessage[];
    meId: string;
    meName: string;
    onlineIds: Set<string>;
    typingNames?: string[];
}) {
    const [newMessage, setNewMessage] = useState('');
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const display = conversationDisplay(conversation, meId);
    const online =
        conversation.type === 'direct' &&
        !!display.otherUser &&
        onlineIds.has(display.otherUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setLocalMessages(messages);
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [localMessages]);

    const { channel } = useEcho(
        `chat.${conversation.id}`,
        'MessageSent',
        (e: any) => {
            if (e.message) {
                setLocalMessages((prev) => {
                    if (prev.find((m) => m.id === e.message.id)) return prev;
                    return [...prev, e.message];
                });
            }
        },
        [conversation.id],
    );

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        // If the backend route is available, it would look like this:
        router.post(
            `/chat/${conversation.id}/messages`,
            { body: newMessage },
            {
                preserveScroll: true,
                onSuccess: () => setNewMessage(''),
            },
        );
    };

    const handleEmojiClick = (emojiData: any) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };

    return (
        <div className="flex h-full w-full flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        asChild
                    >
                        <a href="/chat">
                            <ArrowLeft className="size-5" />
                        </a>
                    </Button>
                    <ChatAvatar
                        name={display.name}
                        avatarUrl={display.avatarUrl}
                        isGroup={conversation.type === 'group'}
                        online={online}
                        className="size-10"
                    />
                    <div>
                        <h2 className="font-semibold">{display.name}</h2>
                        {conversation.type === 'group' ? (
                            <p className="text-xs text-muted-foreground">
                                {conversation.participants.length} participants
                            </p>
                        ) : null}
                    </div>
                </div>
                <div>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="size-5" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {(!localMessages || localMessages.length === 0) && (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>No messages yet. Say hello!</p>
                    </div>
                )}
                {localMessages &&
                    localMessages.map((msg) => {
                        const isMe = msg.user_id === meId;

                        if (msg.type === 'system') {
                            return (
                                <div key={msg.id} className="flex justify-center w-full my-1">
                                    <span className="rounded-full bg-muted/70 px-3 py-0.5 text-xs text-muted-foreground italic select-none">
                                        {msg.body}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    'flex flex-col',
                                    isMe ? 'items-end' : 'items-start',
                                )}
                            >
                                {!isMe && conversation.type === 'group' && msg.sender && (
                                    <span className="text-[11px] font-medium text-primary mb-0.5 ml-1 select-none">
                                        {msg.sender.name}
                                    </span>
                                )}
                                <div
                                    className={cn(
                                        'relative max-w-[75%] rounded-2xl px-3 py-1.5 pb-5 text-sm shadow-sm',
                                        isMe
                                            ? 'rounded-tr-none bg-primary text-primary-foreground'
                                            : 'rounded-tl-none bg-muted text-foreground',
                                    )}
                                >
                                    <div className="whitespace-pre-wrap break-words pr-10">
                                        {msg.body}
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute bottom-1 right-2 flex items-center gap-1 text-[10px] select-none',
                                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                        )}
                                    >
                                        <span>{formatClock(msg.created_at)}</span>
                                        {isMe && (
                                            <MessageStatusIcon
                                                msg={msg}
                                                conversation={conversation}
                                                meId={meId}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex w-full flex-col border-t bg-background p-4">
                {typingNames.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 pb-2 text-sm text-primary">
                        {typingLabel(typingNames)} <TypingDots />
                    </div>
                )}
                <form
                    onSubmit={handleSend}
                    className="flex w-full items-center gap-2"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground"
                    >
                        <Paperclip className="size-5" />
                    </Button>

                    <div className="relative flex flex-1 items-center rounded-full border bg-muted/50 px-3 py-1 focus-within:ring-1 focus-within:ring-primary/50">
                        <Input
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                const ch = channel();
                                if (ch) {
                                    (ch as any).whisper('typing', {
                                        id: meId,
                                        name: meName,
                                    });
                                }
                            }}
                            placeholder="Type a message..."
                            className="h-10 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                >
                                    <Smile className="size-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="top"
                                align="end"
                                className="w-auto border-none bg-transparent p-0 shadow-none"
                            >
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    autoFocusSearch={false}
                                    theme={Theme.AUTO}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        type="submit"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={!newMessage.trim()}
                    >
                        <Send className="size-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}

function MessageStatusIcon({
    msg,
    conversation,
    meId,
}: {
    msg: ChatMessage;
    conversation: Conversation;
    meId: string;
}) {
    const status = getMessageStatus(msg, conversation, meId);

    if (status === 'seen') {
        return <CheckCheck className="size-3.5 shrink-0 text-sky-300" />;
    }
    if (status === 'delivered') {
        return (
            <CheckCheck className="size-3.5 shrink-0 text-primary-foreground/60" />
        );
    }
    return <Check className="size-3.5 shrink-0 text-primary-foreground/60" />;
}
