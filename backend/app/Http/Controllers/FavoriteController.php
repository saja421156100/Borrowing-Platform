<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/favorites",
     *     tags={"Favorites"},
     *     summary="Get authenticated user's favorite items",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=50)),
     *     @OA\Response(response=200, description="Favorites retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $items = $request->user()
            ->favorites()
            ->with(['category', 'owner'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->orderByDesc('favorites.created_at')
            ->paginate($validated['per_page'] ?? 12);

        return response()->json([
            'success' => true,
            'data' => $items->getCollection()
                ->map(fn (Item $item) => $this->formatItem($item))
                ->values(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/favorites/ids",
     *     tags={"Favorites"},
     *     summary="Get favorite item IDs for the authenticated user",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Favorite IDs retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function ids(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()->favorites()->pluck('items.id')->values(),
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/items/{id}/favorite",
     *     tags={"Favorites"},
     *     summary="Add an item to favorites",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item added to favorites"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=404, description="Item not found")
     * )
     */
    public function store(Request $request, Item $item)
    {
        $request->user()->favorites()->syncWithoutDetaching([$item->id]);

        return response()->json([
            'success' => true,
            'message' => 'Item added to favorites.',
            'item_id' => $item->id,
            'is_favorited' => true,
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/items/{id}/favorite",
     *     tags={"Favorites"},
     *     summary="Remove an item from favorites",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item removed from favorites"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=404, description="Item not found")
     * )
     */
    public function destroy(Request $request, Item $item)
    {
        $request->user()->favorites()->detach($item->id);

        return response()->json([
            'success' => true,
            'message' => 'Item removed from favorites.',
            'item_id' => $item->id,
            'is_favorited' => false,
        ]);
    }

    private function formatItem(Item $item): array
    {
        $data = $item->toArray();

        $data['image'] = $item->image
            ? asset('storage/' . $item->image)
            : null;

        $data['is_favorited'] = true;

        if ($item->relationLoaded('owner') && $item->owner) {
            $data['owner'] = [
                'id' => $item->owner->id,
                'name' => $item->owner->name,
            ];
        }

        return $data;
    }
}
