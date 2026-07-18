import type { ChatMessage, Conversation, LastMessage, Participant } from '@/types/chat';

export function conversationDisplay(
    conversation: Conversation,
    meId: string,
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
    meId: string,
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

export function getMessageStatus(
    msg: ChatMessage,
    conversation: Conversation,
    meId: string
): 'sending' | 'sent' | 'delivered' | 'seen' {
    if (!msg.id) {
        return 'sending';
    }

    if (msg.user_id !== meId) {
        return 'sent';
    }

    const otherParticipants = conversation.participants.filter(p => p.id !== meId);
    if (otherParticipants.length === 0) {
        return 'sent';
    }

    const msgTime = new Date(msg.created_at).getTime();

    // Check if all other participants have read it
    const allRead = otherParticipants.every(p => {
        return p.last_read_at && new Date(p.last_read_at).getTime() >= msgTime;
    });

    if (allRead) {
        return 'seen';
    }

    // Check if all other participants have received it
    const allDelivered = otherParticipants.every(p => {
        return (
            (p.last_read_at && new Date(p.last_read_at).getTime() >= msgTime) ||
            (p.last_delivered_at && new Date(p.last_delivered_at).getTime() >= msgTime)
        );
    });

    if (allDelivered) {
        return 'delivered';
    }

    return 'sent';
}

export function getLastMessageStatus(
    conversation: Conversation,
    meId: string
): 'sending' | 'sent' | 'delivered' | 'seen' | null {
    const last = conversation.last_message;
    if (!last || last.is_deleted || last.sender_id !== meId || last.type === 'system') {
        return null;
    }

    const otherParticipants = conversation.participants.filter(p => p.id !== meId);
    if (otherParticipants.length === 0) {
        return 'sent';
    }

    const msgTime = new Date(last.created_at).getTime();

    const allRead = otherParticipants.every(p => {
        return p.last_read_at && new Date(p.last_read_at).getTime() >= msgTime;
    });

    if (allRead) {
        return 'seen';
    }

    const allDelivered = otherParticipants.every(p => {
        return (
            (p.last_read_at && new Date(p.last_read_at).getTime() >= msgTime) ||
            (p.last_delivered_at && new Date(p.last_delivered_at).getTime() >= msgTime)
        );
    });

    if (allDelivered) {
        return 'delivered';
    }

    return 'sent';
}