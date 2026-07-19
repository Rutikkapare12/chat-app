<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function store(Request $request, Conversation $conversation)
    {
        $request->validate([
            'body' => 'required|string',
        ]);

        if (!$conversation->hasParticipant($request->user())) {
            abort(403);
        }

        $message = $conversation->messages()->create([
            'user_id' => $request->user()->id,
            'type' => 'text',
            'body' => $request->body,
        ]);

        $conversation->update([
            'last_message_at' => $message->created_at,
        ]);

        $conversation->participants()->updateExistingPivot($request->user()->id, [
            'last_read_at' => $message->created_at,
            'last_delivered_at' => $message->created_at,
        ]);

        // Invalidate cache for all participants
        foreach ($conversation->participants as $participant) {
            \Illuminate\Support\Facades\Cache::forget("user.{$participant->id}.conversations");
        }

        broadcast(new \App\Events\MessageSent($message))->toOthers();

        return back();
    }

    public function destroy(Request $request, Conversation $conversation, Message $message)
    {
        $request->validate(['type' => 'required|in:for_me,for_everyone']);

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        if (!$conversation->hasParticipant($request->user())) {
            abort(403);
        }

        if ($request->type === 'for_everyone') {
            if ($message->user_id !== $request->user()->id) {
                abort(403, 'You can only delete your own messages for everyone.');
            }
            $message->delete(); // Soft delete
            
            broadcast(new \App\Events\MessageDeleted($message->id, $conversation->id))->toOthers();
        } else {
            $message->hiddenFor()->syncWithoutDetaching([
                $request->user()->id => ['id' => \Illuminate\Support\Str::uuid()->toString()]
            ]);
        }

        // Invalidate cache for all participants so the list updates
        foreach ($conversation->participants as $participant) {
            \Illuminate\Support\Facades\Cache::forget("user.{$participant->id}.conversations");
        }

        return back();
    }
}
