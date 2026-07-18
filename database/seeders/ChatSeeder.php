<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ChatSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $people = [
            ['name' => 'Alice Johnson', 'email' => 'alice@example.com', 'about' => 'Product designer ☕'],
            ['name' => 'Bob Ochieng', 'email' => 'bob@example.com', 'about' => 'Backend dev, Laravel fan'],
            ['name' => 'Carol Wanjiru', 'email' => 'carol@example.com', 'about' => 'Frontend + React'],
            ['name' => 'David Kim', 'email' => 'david@example.com', 'about' => 'Always shipping 🚀'],
            ['name' => 'Emma Njeri', 'email' => 'emma@example.com', 'about' => 'QA engineer'],
        ];

        $users = collect($people)->map(fn(array $p) => User::firstOrCreate(
            ['email' => $p['email']],
            [
                'name' => $p['name'],
                'about' => $p['about'],
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        ));

        [$alice, $bob, $carol, $david] = [$users[0], $users[1], $users[2], $users[3]];

        // A direct conversation with some back-and-forth history.
        $direct = Conversation::findOrCreateDirect($alice, $bob);

        if ($direct->messages()->doesntExist()) {
            $script = [
                [$bob, 'Hey Alice! Did you see the new Reverb release?'],
                [$alice, 'Yes! WebSockets in Laravel with zero external services 🔥'],
                [$bob, 'Exactly. We should use it for the support chat.'],
                [$alice, 'Agreed. I\'ll sketch the UI today.'],
                [$bob, 'Perfect, send it over when ready 👌'],
            ];

            foreach ($script as $i => [$sender, $body]) {
                $direct->messages()->create([
                    'user_id' => $sender->id,
                    'body' => $body,
                    'created_at' => now()->subMinutes(60 - $i * 7),
                ]);
            }

            $direct->update(['last_message_at' => $direct->messages()->max('created_at')]);
        }

        // A group conversation.
        $group = Conversation::firstOrCreate(
            ['type' => 'group', 'name' => 'Project Phoenix 🐦‍🔥'],
            ['created_by' => $alice->id],
        );

        if ($group->participants()->doesntExist()) {
            $group->participants()->attach([
                $alice->id => ['role' => 'admin', 'joined_at' => now()],
                $bob->id => ['role' => 'member', 'joined_at' => now()],
                $carol->id => ['role' => 'member', 'joined_at' => now()],
                $david->id => ['role' => 'member', 'joined_at' => now()],
            ]);

            $group->addSystemMessage('Alice Johnson created the group "Project Phoenix 🐦‍🔥"');

            $script = [
                [$alice, 'Welcome everyone to the project channel! 🎉'],
                [$carol, 'Excited to be here!'],
                [$david, 'Let\'s gooo 🚀'],
                [$bob, 'First standup tomorrow at 9am?'],
                [$alice, 'Works for me 👍'],
            ];

            foreach ($script as $i => [$sender, $body]) {
                $group->messages()->create([
                    'user_id' => $sender->id,
                    'body' => $body,
                    'created_at' => now()->subMinutes(30 - $i * 5),
                ]);
            }

            $group->update(['last_message_at' => $group->messages()->max('created_at')]);
        }
    }
}
