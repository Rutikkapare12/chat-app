import type { Conversation, LastMessage, Participant } from '@/types/chat';

export function conversationDisplay(
    conversation: Conversation,
    meId: number,
): { name: string; avatarUrl: string | null; otherUser: Participant | null } {
    if (conversation.type === 'group') {
        return {
            name: conversation.name ?? 'Group',
            avatarUrl: conversation.avatar_url,
            otherUser: null,
        };
    }

    const other = conversation.participants.find((p) => p.id !== meId) ?? null;

    return {
        name: other?.name ?? 'Unknown user',
        avatarUrl: other?.avatar_url ?? null,
        otherUser: other,
    };
}

export function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/** Sidebar timestamp: clock today, weekday this week, date otherwise. */
export function formatSidebarTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();

    if (isSameDay(date, now)) {
        return formatClock(iso);
    }

    const days = (now.getTime() - date.getTime()) / 86_400_000;

    if (days < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** One-line preview of the latest message for the sidebar. */
export function lastMessagePreview(
    last: LastMessage | null,
    meId: number,
): string {
    if (!last) {
        return 'No messages yet';
    }

    if (last.is_deleted) {
        return '🚫 Message deleted';
    }

    const prefix =
        last.type === 'system' ? '' : last.sender_id === meId ? 'You: ' : '';

    if (last.type === 'image') {
        return `${prefix}📷 Photo`;
    }

    if (last.type === 'file') {
        return `${prefix}📎 ${last.attachment_name ?? 'File'}`;
    }

    return `${prefix}${last.body ?? ''}`;
}