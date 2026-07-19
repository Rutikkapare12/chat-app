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
import type { ChatUser, Conversation, Participant } from '@/types/chat';
import { UserPlus, MoreVertical, LogOut, Trash2, ShieldAlert, Shield } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function GroupInfoDialog({
    open,
    onOpenChange,
    conversation,
    meId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversation: Conversation;
    meId: string;
}) {
    const [adding, setAdding] = useState(false);
    const { query, setQuery, users, loading } = useUserDirectory(adding);
    const [submitting, setSubmitting] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        description: string;
        actionLabel?: string;
        onConfirm: () => void;
    } | null>(null);

    const me = conversation.participants.find(p => p.id === meId);
    const isAdmin = me?.role === 'admin';

    // Sort participants: admins first, then by name
    const sortedParticipants = [...conversation.participants].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.name.localeCompare(b.name);
    });

    const handleAddMember = (user: ChatUser) => {
        setSubmitting(true);
        router.post(
            `/chat/${conversation.id}/participants`,
            { user_ids: [user.id] },
            { 
                preserveState: true, 
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    setAdding(false);
                    setQuery('');
                }
            }
        );
    };

    const handleUpdateRole = (participant: Participant, role: 'admin' | 'member') => {
        setSubmitting(true);
        router.patch(
            `/chat/${conversation.id}/participants/${participant.id}`,
            { role },
            { 
                preserveState: true, 
                preserveScroll: true,
                onFinish: () => setSubmitting(false)
            }
        );
    };

    const handleRemove = (participant: Participant) => {
        setConfirmAction({
            title: 'Remove Member',
            description: `Are you sure you want to remove ${participant.name} from the group?`,
            actionLabel: 'Remove',
            onConfirm: () => {
                setSubmitting(true);
                router.delete(
                    `/chat/${conversation.id}/participants/${participant.id}`,
                    { 
                        preserveState: true, 
                        preserveScroll: true,
                        onFinish: () => {
                            setSubmitting(false);
                            setConfirmAction(null);
                        }
                    }
                );
            }
        });
    };

    const handleLeave = () => {
        setConfirmAction({
            title: 'Leave Group',
            description: `Are you sure you want to leave ${conversation.name}? You won't be able to send or receive messages in this group anymore.`,
            actionLabel: 'Leave',
            onConfirm: () => {
                setSubmitting(true);
                router.delete(
                    `/chat/${conversation.id}/participants/${meId}`,
                    { 
                        onFinish: () => {
                            setSubmitting(false);
                            setConfirmAction(null);
                        }
                    }
                );
            }
        });
    };

    // Filter out users already in the group from search results
    const unselectedUsers = users.filter(u => !conversation.participants.find(p => p.id === u.id));

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setAdding(false);
                setQuery('');
            }
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{conversation.name}</DialogTitle>
                    <DialogDescription>
                        {conversation.participants.length} members
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isAdmin && !adding && (
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setAdding(true)}
                        >
                            <UserPlus className="mr-2 size-4" /> Add Member
                        </Button>
                    )}

                    {adding && (
                        <div className="space-y-2 rounded-md border p-3">
                            <Input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search users to add..."
                            />
                            
                            <div className="max-h-40 space-y-0.5 overflow-y-auto">
                                {loading && (
                                    <div className="flex justify-center py-4">
                                        <Spinner className="size-4" />
                                    </div>
                                )}
                                {!loading && unselectedUsers.length === 0 && (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        {query.trim() ? 'No users found.' : 'Search to add members.'}
                                    </p>
                                )}
                                {!loading && unselectedUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleAddMember(user)}
                                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                                    >
                                        <ChatAvatar name={user.name} avatarUrl={user.avatar_url} className="size-8" />
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium">{user.name}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <Button 
                                variant="ghost" 
                                className="w-full mt-2" 
                                onClick={() => { setAdding(false); setQuery(''); }}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}

                    {!adding && (
                        <div className="max-h-72 space-y-1 overflow-y-auto pr-2">
                            {sortedParticipants.map(participant => (
                                <div key={participant.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <ChatAvatar name={participant.name} avatarUrl={participant.avatar_url} className="size-8 shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-medium">
                                                {participant.name} {participant.id === meId && "(You)"}
                                            </span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {participant.role}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {isAdmin && participant.id !== meId && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                                                    <MoreVertical className="size-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {participant.role === 'member' ? (
                                                    <DropdownMenuItem onClick={() => handleUpdateRole(participant, 'admin')}>
                                                        <Shield className="mr-2 size-4" /> Make Admin
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleUpdateRole(participant, 'member')}>
                                                        <ShieldAlert className="mr-2 size-4" /> Dismiss as Admin
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem 
                                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    onClick={() => handleRemove(participant)}
                                                >
                                                    <Trash2 className="mr-2 size-4" /> Remove from Group
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!adding && (
                    <div className="mt-4 flex justify-end">
                        <Button 
                            variant="destructive" 
                            disabled={submitting}
                            onClick={handleLeave}
                        >
                            <LogOut className="mr-2 size-4" /> Leave Group
                        </Button>
                    </div>
                )}
            </DialogContent>

            <Dialog open={!!confirmAction} onOpenChange={(val) => {
                if (!val && !submitting) setConfirmAction(null);
            }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{confirmAction?.title}</DialogTitle>
                        <DialogDescription>{confirmAction?.description}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmAction?.onConfirm} disabled={submitting}>
                            {submitting ? <Spinner className="mr-2 size-4" /> : null}
                            {confirmAction?.actionLabel ?? 'Confirm'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
