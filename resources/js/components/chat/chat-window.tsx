import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Send, Smile, Paperclip, MoreVertical, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { conversationDisplay, formatClock, getMessageStatus } from '@/lib/chat-utils';
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
    meId: number;
    meName: string;
    onlineIds: Set<number>;
    typingNames?: string[];
}) {
    const [newMessage, setNewMessage] = useState('');
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const display = conversationDisplay(conversation, meId);
    const online = conversation.type === 'direct' && !!display.otherUser && onlineIds.has(display.otherUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setLocalMessages(messages);
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [localMessages]);

    const { channel } = useEcho(`chat.${conversation.id}`, 'MessageSent', (e: any) => {
        if (e.message) {
            setLocalMessages((prev) => {
                if (prev.find((m) => m.id === e.message.id)) return prev;
                return [...prev, e.message];
            });
        }
    }, [conversation.id]);



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
            }
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
                    <Button variant="ghost" size="icon" className="md:hidden" asChild>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(!localMessages || localMessages.length === 0) && (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>No messages yet. Say hello!</p>
                    </div>
                )}
                {localMessages && localMessages.map((msg) => {
                    const isMe = msg.user_id === meId;
                    return (
                        <div
                            key={msg.id}
                            className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                        >
                            <div
                                className={cn(
                                    'max-w-[75%] rounded-2xl px-4 py-2',
                                    isMe
                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                        : 'bg-muted text-foreground rounded-bl-sm'
                                )}
                            >
                                {msg.type === 'system' ? (
                                    <p className="text-sm italic text-muted-foreground">{msg.body}</p>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.body}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                                <span className="text-[10px] text-muted-foreground">
                                    {formatClock(msg.created_at)}
                                </span>
                                {isMe && msg.type !== 'system' && (
                                    <MessageStatusIcon msg={msg} conversation={conversation} meId={meId} />
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex w-full flex-col p-4 bg-background border-t">
                {typingNames.length > 0 && (
                    <div className="pb-2 text-sm text-primary flex items-center gap-1.5 px-2">
                        {typingLabel(typingNames)} <TypingDots />
                    </div>
                )}
                <form
                    onSubmit={handleSend}
                    className="flex w-full items-center gap-2"
                >
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                        <Paperclip className="size-5" />
                    </Button>

                    <div className="flex-1 relative flex items-center bg-muted/50 rounded-full px-3 py-1 border focus-within:ring-1 focus-within:ring-primary/50">
                        <Input
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                const ch = channel();
                                if (ch) {
                                    (ch as any).whisper('typing', { id: meId, name: meName });
                                }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-10"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <Smile className="size-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="end" className="w-auto p-0 border-none shadow-none bg-transparent">
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
                        className="shrink-0 rounded-full h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={!newMessage.trim()}
                    >
                        <Send className="size-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}

function MessageStatusIcon({ msg, conversation, meId }: { msg: ChatMessage, conversation: Conversation, meId: number }) {
    const status = getMessageStatus(msg, conversation, meId);

    if (status === 'seen') {
        return <CheckCheck className="size-3.5 text-sky-500 shrink-0" />;
    }
    if (status === 'delivered') {
        return <CheckCheck className="size-3.5 text-muted-foreground shrink-0" />;
    }
    return <Check className="size-3.5 text-muted-foreground shrink-0" />;
}
