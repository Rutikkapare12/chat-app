<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

#[Fillable(['type', 'name', 'avatar_path', 'created_by', 'last_message_at'])]
class Conversation extends Model
{
    use HasFactory;

    protected function casts(): array 
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot(['role', 'joined_at', 'last_read_at', 'last_delivered_at', 'muted_at'])
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    /**
     * In a direct conversation, the participant who isn't $user.
     */
    public function otherParticipant(User $user): ?User
    {
        return $this->participants->firstWhere('id', '!=', $user->id);
    }

    public function hasParticipant(User $user): bool
    {
        return $this->participants()->whereKey($user->id)->exists();
    }

    public function isAdmin(User $user): bool
    {
        $participant = $this->participants()->whereKey($user->id)->first();

        return $participant?->pivot->role === 'admin';
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->whereHas('participants', fn (Builder $q) => $q->whereKey($user->id));
    }

     /**
     * Find the existing direct conversation between two users, or create it.
     */
     public static function findOrCreateDirect(User $a, User $b): self
     {
         $existing = static::query()
             ->where('type', 'direct')
             ->whereHas('participants', fn (Builder $q) => $q->whereKey($a->id))
             ->whereHas('participants', fn (Builder $q) => $q->whereKey($b->id))
             ->first();
 
         if ($existing) {
             return $existing;
         }
 
         $conversation = static::create([
             'type' => 'direct',
             'created_by' => $a->id,
         ]);
 
         $conversation->participants()->attach([
             $a->id => ['joined_at' => now()],
             $b->id => ['joined_at' => now()],
         ]);
 
         return $conversation;
     }
 
     /**
      * Append a system message (e.g. "Alice added Bob") to the conversation.
      */
     public function addSystemMessage(string $body): Message
     {
         $message = $this->messages()->create([
             'type' => 'system',
             'body' => $body,
         ]);
 
         $this->update(['last_message_at' => $message->created_at]);
 
         return $message;
     }

     /**
     * Shape shared with the frontend (sidebar + header). When $for is given,
     * per-user fields like unread_count and muted are included.
     */
     public function toChatArray(?User $for = null): array
     {
        $this->loadMissing(['participants', 'lastMessage.sender']);

        $me = $for ? $this->participants->firstWhere('id', $for->id) : null;

        $unreadCount = null;

        if ($me) {
            $unreadCount = $this->messages()
                ->where('user_id', '!=', $for->id)
                ->when($me->pivot->last_read_at, fn ($q, $t) => $q->where('created_at', '>', $t))
                ->count();
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $this->name,
            'avatar_url' => $this->avatar_path
                ? Storage::disk('public')->url($this->avatar_path)
                : null,
            'created_by' => $this->created_by,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'participants' => $this->participants->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'avatar_url' => $u->avatar_url,
                'about' => $u->about,
                'last_seen_at' => $u->last_seen_at?->toIso8601String(),
                'role' => $u->pivot->role,
                'last_read_at' => $u->pivot->last_read_at
                    ? Carbon::parse($u->pivot->last_read_at)->toIso8601String()
                    : null,
                'last_delivered_at' => $u->pivot->last_delivered_at
                    ? Carbon::parse($u->pivot->last_delivered_at)->toIso8601String()
                    : null,
            ])->values()->all(),
            'last_message' => $this->lastMessage ? [
                'id' => $this->lastMessage->id,
                'type' => $this->lastMessage->type,
                'body' => $this->lastMessage->deleted_at ? null : $this->lastMessage->body,
                'is_deleted' => (bool) $this->lastMessage->deleted_at,
                'attachment_name' => $this->lastMessage->attachment_name,
                'sender_id' => $this->lastMessage->user_id,
                'sender_name' => $this->lastMessage->sender?->name,
                'created_at' => $this->lastMessage->created_at->toIso8601String(),
            ] : null,
            'unread_count' => $unreadCount,
            'muted' => $me ? (bool) $me->pivot->muted_at : false,
        ];
     }
}
