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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { GroupInfoDialog } from './group-info-dialog';

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
    const [groupInfoOpen, setGroupInfoOpen] = useState(false);
    const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
    const [deleteMessageType, setDeleteMessageType] = useState<'for_me' | 'for_everyone'>('for_me');
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

    useEcho(
        `chat.${conversation.id}`,
        'MessageDeleted',
        (e: any) => {
            if (e.messageId) {
                setLocalMessages((prev) => 
                    prev.map(m => m.id === e.messageId ? { ...m, is_deleted: true, body: null } : m)
                );
            }
        },
        [conversation.id],
    );

    const handleDelete = (messageId: string, type: 'for_me' | 'for_everyone') => {
        router.delete(`/chat/${conversation.id}/messages/${messageId}`, {
            data: { type },
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setLocalMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, body: null } : m));
            }
        });
    };

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
                <div
                    className={cn(
                        'flex items-center gap-3',
                        conversation.type === 'group' &&
                            'cursor-pointer transition-opacity hover:opacity-80',
                    )}
                    onClick={() => {
                        if (conversation.type === 'group')
                            setGroupInfoOpen(true);
                    }}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        asChild
                        onClick={(e) => e.stopPropagation()}
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
                    {conversation.type === 'group' ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setGroupInfoOpen(true)}
                        >
                            <MoreVertical className="size-5" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="size-5" />
                        </Button>
                    )}
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
                                <div
                                    key={msg.id}
                                    className="my-1 flex w-full justify-center"
                                >
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
                                    'flex flex-col group',
                                    isMe ? 'items-end' : 'items-start',
                                )}
                            >
                                {!isMe &&
                                    conversation.type === 'group' &&
                                    msg.sender && (
                                        <div className="mb-1 ml-1 flex items-center gap-1.5 select-none">
                                            <ChatAvatar
                                                name={msg.sender.name}
                                                avatarUrl={
                                                    msg.sender.avatar_url
                                                }
                                                className="size-7"
                                            />
                                            <span className="text-[11px] font-medium text-primary">
                                                {msg.sender.name}
                                            </span>
                                        </div>
                                    )}
                                <div
                                    className={cn(
                                        'relative max-w-[75%] rounded-2xl px-3 py-1.5 pb-5 text-sm shadow-sm',
                                        isMe
                                            ? 'rounded-tr-none bg-primary text-primary-foreground'
                                            : 'rounded-tl-none bg-muted text-foreground',
                                        msg.is_deleted && 'bg-muted text-muted-foreground italic'
                                    )}
                                >
                                    {!msg.is_deleted && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className={cn(
                                                        "absolute top-1 z-10 size-6 bg-background/50 backdrop-blur-sm shadow-sm rounded-full text-foreground hover:bg-background transition-opacity",
                                                        "opacity-0 pointer-events-none",
                                                        "group-hover:opacity-100 group-hover:pointer-events-auto",
                                                        "data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto",
                                                        isMe ? "-left-8" : "-right-8"
                                                    )}
                                                >
                                                    <MoreVertical className="size-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                                <DropdownMenuContent align={isMe ? "end" : "start"}>
                                                    <DropdownMenuItem onSelect={() => {
                                                        setTimeout(() => {
                                                            setDeleteMessageType('for_me');
                                                            setDeleteMessageId(msg.id);
                                                        }, 50);
                                                    }}>
                                                        Delete for me
                                                    </DropdownMenuItem>
                                                    {isMe && (
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                            onSelect={() => {
                                                                setTimeout(() => {
                                                                    setDeleteMessageType('for_everyone');
                                                                    setDeleteMessageId(msg.id);
                                                                }, 50);
                                                            }}
                                                        >
                                                            Delete for everyone
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                    )}
                                    <div className="pr-10 break-words whitespace-pre-wrap">
                                        {msg.is_deleted ? 'This message was deleted' : msg.body}
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute right-2 bottom-1 flex items-center gap-1 text-[10px] select-none',
                                            isMe
                                                ? 'text-primary-foreground/70'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        <span>
                                            {formatClock(msg.created_at)}
                                        </span>
                                        {isMe && !msg.is_deleted && (
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

            {conversation.type === 'group' && (
                <GroupInfoDialog
                    open={groupInfoOpen}
                    onOpenChange={setGroupInfoOpen}
                    conversation={conversation}
                    meId={meId}
                />
            )}

            <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl text-primary">Delete message ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteMessageType === 'for_everyone'
                                ? 'Are you sure you want to delete this message for everyone? This action cannot be undone.'
                                : 'Are you sure you want to delete this message for yourself? It will remain visible to other participants.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                if (deleteMessageId) handleDelete(deleteMessageId, deleteMessageType);
                                setDeleteMessageId(null);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
