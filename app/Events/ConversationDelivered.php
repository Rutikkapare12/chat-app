<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationDelivered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;
    public $userId;
    public $lastDeliveredAt;

    /**
     * Create a new event instance.
     */
    public function __construct(string $conversationId, string $userId, $lastDeliveredAt)
    {
        $this->conversationId = $conversationId;
        $this->userId = $userId;
        $this->lastDeliveredAt = is_string($lastDeliveredAt) ? $lastDeliveredAt : $lastDeliveredAt->toIso8601String();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        $conversation = \App\Models\Conversation::find($this->conversationId);
        if ($conversation) {
            foreach ($conversation->participants as $participant) {
                $channels[] = new PrivateChannel('user.' . $participant->id);
            }
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'conversationId' => $this->conversationId,
            'userId' => $this->userId,
            'lastDeliveredAt' => $this->lastDeliveredAt,
        ];
    }
}
