<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ConversationPolicy
{
    /**
     * Any participant can view the conversation and send messages to it.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user);
    }

    /**
     * Only group admins can rename, change the avatar, or manage members.
     * Direct conversations are never managed.
     */
    public function manage(User $user, Conversation $conversation): bool
    {
        return $conversation->isGroup() && $conversation->isAdmin($user);
    }
}
