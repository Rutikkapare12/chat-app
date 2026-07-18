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
        }

        $conversations = Conversation::forUser($user)
            ->with(['participants', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Conversation $c) => $c->toChatArray($user))
            ->values();

        return Inertia::render('chat/index', [
            'conversations' => $conversations,
            'activeConversation' => $conversation?->toChatArray($user),
            'messages' => null,
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
