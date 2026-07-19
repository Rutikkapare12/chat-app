<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ConversationParticipantController extends Controller
{
    public function store(Request $request, Conversation $conversation)
    {
        if (!$conversation->isGroup() || !$conversation->isAdmin($request->user())) {
            abort(403, 'Only group admins can add members.');
        }

        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['required', 'string', 'uuid', 'exists:users,id'],
        ]);

        $participants = [];
        $addedNames = [];

        foreach ($validated['user_ids'] as $id) {
            if (!$conversation->participants->contains('id', $id)) {
                $participants[$id] = ['role' => 'member', 'joined_at' => now()];
                $addedUser = User::find($id);
                if ($addedUser) {
                    $addedNames[] = $addedUser->name;
                }
            }
        }

        if (count($participants) > 0) {
            $conversation->participants()->attach($participants);
            $namesStr = implode(', ', $addedNames);
            $conversation->addSystemMessage("{$request->user()->name} added {$namesStr}.");

            $this->clearConversationCache($conversation);
        }

        return redirect()->back();
    }

    public function update(Request $request, Conversation $conversation, User $user)
    {
        if (!$conversation->isGroup() || !$conversation->isAdmin($request->user())) {
            abort(403, 'Only group admins can change roles.');
        }

        if (!$conversation->hasParticipant($user)) {
            abort(404, 'User is not in this group.');
        }

        $validated = $request->validate([
            'role' => ['required', 'in:admin,member'],
        ]);

        $conversation->participants()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        $roleName = $validated['role'] === 'admin' ? 'an admin' : 'a member';
        $conversation->addSystemMessage("{$request->user()->name} made {$user->name} {$roleName}.");

        $this->clearConversationCache($conversation);

        return redirect()->back();
    }

    public function destroy(Request $request, Conversation $conversation, User $user)
    {
        if (!$conversation->isGroup()) {
            abort(400, 'Cannot remove participants from a direct conversation.');
        }

        $isSelf = $request->user()->id === $user->id;

        if (!$isSelf && !$conversation->isAdmin($request->user())) {
            abort(403, 'Only group admins can remove members.');
        }

        if (!$conversation->hasParticipant($user)) {
            abort(404, 'User is not in this group.');
        }

        $conversation->participants()->detach($user->id);

        if ($isSelf) {
            $conversation->addSystemMessage("{$user->name} left the group.");
        } else {
            $conversation->addSystemMessage("{$request->user()->name} removed {$user->name}.");
        }

        $this->clearConversationCache($conversation);
        Cache::forget("user.{$user->id}.conversations");

        if ($isSelf) {
            return redirect()->route('chat.index');
        }

        return redirect()->back();
    }

    private function clearConversationCache(Conversation $conversation)
    {
        $conversation->load('participants'); // reload to get updated list
        foreach ($conversation->participants as $participant) {
            Cache::forget("user.{$participant->id}.conversations");
        }
    }
}
