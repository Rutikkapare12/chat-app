<?php

use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\Chat\ConversationController;
use App\Http\Controllers\Chat\MessageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Chat screen
    Route::get('chat', [ChatController::class, 'index'])->name('chat.index');
    Route::get('chat/users', [ChatController::class, 'users'])->name('chat.users');
    Route::get('chat/{conversation}', [ChatController::class, 'index'])->name('chat.show');

    // Conversations
    Route::post('conversations', [ConversationController::class, 'store'])->name('conversations.store');
    Route::post('chat/{conversation}/read', [ConversationController::class, 'markAsRead'])->name('conversations.read');
    Route::post('chat/{conversation}/delivered', [ConversationController::class, 'markAsDelivered'])->name('conversations.delivered');

    // Messages
    Route::post('chat/{conversation}/messages', [MessageController::class, 'store'])->name('messages.store');
});