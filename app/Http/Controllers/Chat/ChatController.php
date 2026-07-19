<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Cache;
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

            // Clear cache for current user since their pivot updated
            Cache::forget("user.{$user->id}.conversations");
        }

        // Check if there are any conversations with new messages that haven't been marked as delivered
        $hasUndelivered = Conversation::forUser($user)
            ->whereHas('participants', function ($q) use ($user) {
                $q->whereKey($user->id)
                  ->where(function ($query) {
                      $query->whereNull('conversation_participants.last_delivered_at')
                            ->orWhereColumn('conversation_participants.last_delivered_at', '<', 'conversations.last_message_at');
                  });
            })
            ->exists();

        if ($hasUndelivered) {
            $conversationsToUpdate = Conversation::forUser($user)
                ->with(['participants'])
                ->get();

            foreach ($conversationsToUpdate as $c) {
                $me = $c->participants->firstWhere('id', $user->id);
                if ($me && $c->last_message_at) {
                    $lastDelivered = $me->pivot->last_delivered_at;
                    if (!$lastDelivered || $lastDelivered < $c->last_message_at) {
                        $timestamp = now();
                        $c->participants()->updateExistingPivot($user->id, [
                            'last_delivered_at' => $timestamp,
                        ]);
                        broadcast(new \App\Events\ConversationDelivered($c->id, $user->id, $timestamp))->toOthers();
                    }
                }
            }
            // Clear cache for current user
            Cache::forget("user.{$user->id}.conversations");
        }

        // Retrieve conversations from cache or fetch from database
        $conversations = Cache::remember("user.{$user->id}.conversations", now()->addDay(), function () use ($user) {
            return Conversation::forUser($user)
                ->with(['participants', 'lastMessage.sender'])
                ->orderByDesc('last_message_at')
                ->orderByDesc('id')
                ->get()
                ->map(fn (Conversation $c) => $c->toChatArray($user))
                ->values()
                ->all();
        });

        $messages = null;
        if ($conversation) {
            $messages = $conversation->messages()
                ->withTrashed()
                ->with(['sender', 'hiddenFor' => function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                }])
                ->orderByDesc('id')
                ->limit(50)
                ->get()
                ->reverse()
                ->map(function ($m) {
                    $isHidden = $m->hiddenFor->isNotEmpty();
                    $isDeleted = $m->deleted_at || $isHidden;

                    return [
                        'id' => $m->id,
                        'conversation_id' => $m->conversation_id,
                        'user_id' => $m->user_id,
                        'type' => $m->type,
                        'body' => $isDeleted ? null : $m->body,
                        'is_deleted' => $isDeleted,
                        'edited_at' => $m->edited_at?->toIso8601String(),
                        'created_at' => $m->created_at->toIso8601String(),
                        'sender' => $m->sender ? [
                            'id' => $m->sender->id,
                            'name' => $m->sender->name,
                            'avatar_url' => $m->sender->avatar_url,
                        ] : null,
                    ];
                })
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
