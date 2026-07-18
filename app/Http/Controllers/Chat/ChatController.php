<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function index(Request $request, ?Conversation $conversation = null): Response
    {
        $user = $request->user();

        if ($conversation) {
            Gate::authorize('view', $conversation);

            // Mark active conversation as read and delivered
            $timestamp = now();
            $conversation->participants()->updateExistingPivot($user->id, [
                'last_read_at' => $timestamp,
                'last_delivered_at' => $timestamp,
            ]);
            broadcast(new \App\Events\ConversationRead($conversation->id, $user->id, $timestamp))->toOthers();
        }

        $conversationsQuery = Conversation::forUser($user)
            ->with(['participants', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        // Mark conversations that have new messages as delivered
        foreach ($conversationsQuery as $c) {
            $me = $c->participants->firstWhere('id', $user->id);
            if ($me && $c->last_message_at) {
                $lastDelivered = $me->pivot->last_delivered_at;
                if (!$lastDelivered || $lastDelivered < $c->last_message_at) {
                    $timestamp = now();
                    $c->participants()->updateExistingPivot($user->id, [
                        'last_delivered_at' => $timestamp,
                    ]);
                    
                    // Update pivot in the current collection instance so serialization is correct
                    $me->pivot->last_delivered_at = $timestamp;
                    
                    // Broadcast delivered status
                    broadcast(new \App\Events\ConversationDelivered($c->id, $user->id, $timestamp))->toOthers();
                }
            }
        }

        $conversations = $conversationsQuery
            ->map(fn (Conversation $c) => $c->toChatArray($user))
            ->values();

        $messages = null;
        if ($conversation) {
            $messages = $conversation->messages()
                ->with('sender')
                ->orderByDesc('id')
                ->limit(50)
                ->get()
                ->reverse()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'conversation_id' => $m->conversation_id,
                    'user_id' => $m->user_id,
                    'type' => $m->type,
                    'body' => $m->deleted_at ? null : $m->body,
                    'is_deleted' => (bool) $m->deleted_at,
                    'edited_at' => $m->edited_at?->toIso8601String(),
                    'created_at' => $m->created_at->toIso8601String(),
                    'sender' => $m->sender ? [
                        'id' => $m->sender->id,
                        'name' => $m->sender->name,
                        'avatar_url' => $m->sender->avatar_url,
                    ] : null,
                ])
                ->values()
                ->all();
        }

        return Inertia::render('chat/index', [
            'conversations' => $conversations,
            'activeConversation' => $conversation?->toChatArray($user),
            'messages' => $messages,
        ]);
    }

    public function users(Request $request)
    {
        $query = trim((string) $request->query('q', ''));

        return User::query()
            ->whereKeyNot($request->user()->id)
            ->when($query !== '', fn ($q) => $q->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%");
            }))
            ->orderBy('name')
            ->limit(25)
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatar_url,
                'about' => $u->about,
            ]);
    }
}
