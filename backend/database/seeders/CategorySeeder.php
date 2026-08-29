<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        Category::create([
            'name' => 'Electronics',
            'description' => 'Electronic devices and accessories',
        ]);

        Category::create([
            'name' => 'Books',
            'description' => 'Books and educational materials',
        ]);

        Category::create([
            'name' => 'Sports',
            'description' => 'Sports equipment and accessories',
        ]);

        Category::create([
            'name' => 'Tools',
            'description' => 'Tools and equipment',
        ]);
    }
}