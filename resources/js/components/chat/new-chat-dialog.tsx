import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { chatApi } from '@/lib/chat-api';
import type { ChatUser } from '@/types/chat';

export function useUserDirectory(open: boolean) {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const timeout = setTimeout(() => {
            setLoading(true);
            chatApi
                .get<ChatUser[]>(`/chat/users?q=${encodeURIComponent(query)}`)
                .then(setUsers)
                .catch(() => setUsers([]))
                .finally(() => setLoading(false));
        }, 250);

        return () => clearTimeout(timeout);
    }, [open, query]);

    return { query, setQuery, users, loading };
}

export function NewChatDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { query, setQuery, users, loading } = useUserDirectory(open);

    const startChat = (user: ChatUser) => {
        onOpenChange(false);
        router.post(
            '/conversations',
            { user_id: user.id },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New chat</DialogTitle>
                    <DialogDescription>
                        Pick someone to start a conversation with.
                    </DialogDescription>
                </DialogHeader>

                <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email"
                />

                <div className="max-h-72 space-y-0.5 overflow-y-auto">
                    {loading && (
                        <div className="flex justify-center py-6">
                            <Spinner className="size-5" />
                        </div>
                    )}
                    {!loading && users.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No users found.
                        </p>
                    )}
                    {!loading &&
                        users.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => startChat(user)}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
                            >
                                <ChatAvatar
                                    name={user.name}
                                    avatarUrl={user.avatar_url}
                                />
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">
                                        {user.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {user.about ?? user.email}
                                    </span>
                                </span>
                            </button>
                        ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}