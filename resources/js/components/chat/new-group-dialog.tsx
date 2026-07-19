import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useUserDirectory } from '@/components/chat/new-chat-dialog';
import type { ChatUser } from '@/types/chat';
import { X } from 'lucide-react';

export function NewGroupDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { query, setQuery, users, loading } = useUserDirectory(open);
    const [name, setName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const toggleUser = (user: ChatUser) => {
        if (selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const createGroup = () => {
        if (!name.trim() || selectedUsers.length === 0) return;
        
        setSubmitting(true);
        router.post(
            '/conversations',
            { 
                is_group: true, 
                name: name.trim(), 
                user_ids: selectedUsers.map((u) => u.id) 
            },
            { 
                preserveState: true, 
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    onOpenChange(false);
                    setName('');
                    setSelectedUsers([]);
                    setQuery('');
                }
            },
        );
    };

    // Filter out already selected users from search results for cleaner UX
    const unselectedUsers = users.filter(u => !selectedUsers.find(su => su.id === u.id));

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setName('');
                setSelectedUsers([]);
                setQuery('');
            }
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create group</DialogTitle>
                    <DialogDescription>
                        Give your group a name and add members.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Group Name"
                            maxLength={50}
                        />
                    </div>

                    <div className="space-y-2">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search users to add..."
                        />
                    </div>

                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
                                    <ChatAvatar name={user.name} avatarUrl={user.avatar_url} className="size-4" />
                                    <span>{user.name}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => toggleUser(user)}
                                        className="ml-1 rounded-full p-0.5 hover:bg-background/80 transition-colors"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border p-1">
                        {loading && (
                            <div className="flex justify-center py-6">
                                <Spinner className="size-5" />
                            </div>
                        )}
                        {!loading && unselectedUsers.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {query.trim() ? 'No users found.' : 'Search to add members.'}
                            </p>
                        )}
                        {!loading &&
                            unselectedUsers.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => toggleUser(user)}
                                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
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
                </div>
                
                <div className="flex justify-end pt-2">
                    <Button 
                        disabled={!name.trim() || selectedUsers.length === 0 || submitting}
                        onClick={createGroup}
                    >
                        {submitting ? <Spinner className="mr-2 size-4" /> : null}
                        Create Group
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
