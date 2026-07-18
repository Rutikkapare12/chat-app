<?php

namespace App\Models;

use App\Models\MessageReaction;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

#[Fillable([
    'conversation_id', 'user_id', 'reply_to_id', 'type', 'body',
    'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size',
    'edited_at',
])]
class Message extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
            'attachment_size' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id')->withTrashed();
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    public function hiddenFor(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'hidden_messages')->withTimestamps();
    }
}
