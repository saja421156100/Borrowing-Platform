<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Item;
use App\Models\Review;
use App\Models\User;

class HomeController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/home",
     *     tags={"Home"},
     *     summary="Get public home page data",
     *     @OA\Response(response=200, description="Home data retrieved successfully")
     * )
     */
    public function index()
    {
        $categories = Category::withCount('items')
            ->orderByDesc('items_count')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'description']);

        $items = Item::with(['category:id,name', 'owner:id,name'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->where('status', 'available')
            ->orderByDesc('reviews_avg_rating')
            ->orderByDesc('reviews_count')
            ->orderByDesc('created_at')
            ->limit(4)
            ->get();

        $averageRating = Review::avg('rating');

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'members' => User::where('role', '!=', 'admin')->count(),
                    'items' => Item::count(),
                    'rating' => $averageRating ? round((float) $averageRating, 1) : null,
                    'reviews' => Review::count(),
                ],
                'categories' => $categories,
                'items' => $items->map(fn (Item $item) => $this->formatItem($item))->values(),
            ],
        ]);
    }

    private function formatItem(Item $item): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'description' => $item->description,
            'image' => $item->image ? asset('storage/' . $item->image) : null,
            'status' => $item->status,
            'condition' => $item->condition,
            'location' => $item->location,
            'created_at' => $item->created_at?->toISOString(),
            'reviews_count' => (int) ($item->reviews_count ?? 0),
            'reviews_avg_rating' => $item->reviews_avg_rating !== null
                ? round((float) $item->reviews_avg_rating, 1)
                : null,
            'category' => $item->category ? [
                'id' => $item->category->id,
                'name' => $item->category->name,
            ] : null,
            'owner' => $item->owner ? [
                'id' => $item->owner->id,
                'name' => $item->owner->name,
            ] : null,
        ];
    }
}
