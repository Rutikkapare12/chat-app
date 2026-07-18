export type ChatUser = {
    id: string;
    name: string;
    email?: string;
    avatar_url: string | null;
    about?: string | null;
};

export type Participant = ChatUser & {
    last_seen_at: string | null;
    role: 'member' | 'admin';
    last_read_at: string | null;
    last_delivered_at: string | null;
};

export type ReactionGroup = {
    emoji: string;
    count: number;
    user_ids: string[];
    user_names: string[];
};

export type Attachment = {
    url: string;
    name: string | null;
    mime: string | null;
    size: number | null;
};

export type ReplyPreview = {
    id: string;
    body: string | null;
    is_deleted: boolean;
    type: string;
    attachment_name: string | null;
    sender_name: string | null;
};

export type ChatMessage = {
    id: string;
    conversation_id: string;
    user_id: string | null;
    type: 'text' | 'image' | 'file' | 'system';
    body: string | null;
    is_deleted: boolean;
    edited_at: string | null;
    created_at: string;
    sender: ChatUser | null;
    attachment: Attachment | null;
    reply_to: ReplyPreview | null;
    reactions: ReactionGroup[];
};

export type LastMessage = {
    id: string;
    type: string;
    body: string | null;
    is_deleted: boolean;
    attachment_name: string | null;
    sender_id: string | null;
    sender_name: string | null;
    created_at: string;
};

export type Conversation = {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    avatar_url: string | null;
    created_by: string | null;
    last_message_at: string | null;
    participants: Participant[];
    last_message: LastMessage | null;
    unread_count: number | null;
    muted: boolean;
};

export type SearchResult = ChatMessage & {
    conversation: { id: string; type: string; name: string | null };
};