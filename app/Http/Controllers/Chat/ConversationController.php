<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreConversationRequest;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function store(StoreConversationRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if ($request->filled('user_id')) {

            $conversation = Conversation::findOrCreateDirect($user, User::findOrFail($validated['user_id']));

            // Clear cache for both participants
            \Illuminate\Support\Facades\Cache::forget("user.{$user->id}.conversations");
            \Illuminate\Support\Facades\Cache::forget("user.{$validated['user_id']}.conversations");

            return redirect()->route('chat.show', $conversation);
        }

        if ($request->boolean('is_group')) {

            $conversation = Conversation::create([
                'type' => 'group',
                'name' => $validated['name'],
                'created_by' => $user->id,
            ]);

            $participants = [
                $user->id => ['role' => 'admin', 'joined_at' => now()],
            ];

            foreach ($validated['user_ids'] as $id) {
                $participants[$id] = ['role' => 'member', 'joined_at' => now()];
            }

            $conversation->participants()->attach($participants);

            $conversation->addSystemMessage("{$user->name} created the group \"{$validated['name']}\".");

            \Illuminate\Support\Facades\Cache::forget("user.{$user->id}.conversations");
            foreach ($validated['user_ids'] as $id) {
                \Illuminate\Support\Facades\Cache::forget("user.{$id}.conversations");
            }

            return redirect()->route('chat.show', $conversation);
        }

        abort(400, 'Invalid conversation type.');
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

        \Illuminate\Support\Facades\Cache::forget("user.{$request->user()->id}.conversations");

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

        \Illuminate\Support\Facades\Cache::forget("user.{$request->user()->id}.conversations");

        broadcast(new \App\Events\ConversationDelivered($conversation->id, $request->user()->id, $timestamp))->toOthers();

        return response()->json(['success' => true]);
    }
}
