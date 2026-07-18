<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($request->filled('user_id')) {
            $validated = $request->validate([
                'user_id' => ['required', 'integer', 'exists:users,id', 'not_in:'.$user->id],
            ]);

            $conversation = Conversation::findOrCreateDirect($user, User::findOrFail($validated['user_id']));

            return redirect()->route('chat.show', $conversation);
        }

        // Group creation lands here — we build it in Episode 11.
    }

    public function markAsRead(Request $request, Conversation $conversation)
    {
        if (!$conversation->hasParticipant($request->user())) {
            abort(403);
        }

        $timestamp = now();
        $conversation->participants()->updateExistingPivot($request->user()->id, [
            'last_read_at' => $timestamp,
            'last_delivered_at' => $timestamp,
        ]);

        broadcast(new \App\Events\ConversationRead($conversation->id, $request->user()->id, $timestamp))->toOthers();

        return response()->json(['success' => true]);
    }

    public function markAsDelivered(Request $request, Conversation $conversation)
    {
        if (!$conversation->hasParticipant($request->user())) {
            abort(403);
        }

        $timestamp = now();
        $conversation->participants()->updateExistingPivot($request->user()->id, [
            'last_delivered_at' => $timestamp,
        ]);

        broadcast(new \App\Events\ConversationDelivered($conversation->id, $request->user()->id, $timestamp))->toOthers();

        return response()->json(['success' => true]);
    }
}
