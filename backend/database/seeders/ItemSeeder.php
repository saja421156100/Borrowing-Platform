<?php

namespace Database\Seeders;

use App\Models\Item;
use Illuminate\Database\Seeder;

class ItemSeeder extends Seeder
{
    public function run(): void
    {
        Item::create([
            'category_id' => 1,
            'user_id' => 1,
            'name' => 'Laptop Dell',
            'description' => 'Dell laptop available for borrowing',
            'image' => null,
            'status' => 'available',
        ]);

        Item::create([
            'category_id' => 1,
            'user_id' => 1,
            'name' => 'Digital Camera',
            'description' => 'Digital camera for photography',
            'image' => null,
            'status' => 'available',
        ]);

        Item::create([
            'category_id' => 2,
            'user_id' => 1,
            'name' => 'Programming Book',
            'description' => 'Book about programming and software development',
            'image' => null,
            'status' => 'available',
        ]);

        Item::create([
            'category_id' => 3,
            'user_id' => 1,
            'name' => 'Football',
            'description' => 'Football available for borrowing',
            'image' => null,
            'status' => 'available',
        ]);
    }
}