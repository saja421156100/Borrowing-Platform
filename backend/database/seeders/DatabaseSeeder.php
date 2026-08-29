<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Sara',
            'email' => 'sara@example.com',
            'password' => Hash::make('password123'),
        ]);

        $this->call([
            CategorySeeder::class,
            ItemSeeder::class,
        ]);
    }
}