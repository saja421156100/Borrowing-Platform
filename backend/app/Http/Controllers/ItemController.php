<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/items",
     *     tags={"Items"},
     *     summary="Get all items",
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="category_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="status", in="query", required=false, @OA\Schema(type="string", enum={"available","borrowed","unavailable"})),
     *     @OA\Parameter(name="condition", in="query", required=false, @OA\Schema(type="string", enum={"excellent","good","fair"})),
     *     @OA\Parameter(name="location", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort", in="query", required=false, @OA\Schema(type="string", enum={"name","newest","oldest","rating"})),
     *     @OA\Response(response=200, description="Items retrieved successfully")
     * )
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|exists:categories,id',
            'status' => 'nullable|in:available,borrowed,unavailable',
            'condition' => 'nullable|in:excellent,good,fair',
            'location' => 'nullable|string|max:255',
            'sort' => 'nullable|in:name,newest,oldest,rating',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $query = Item::with(['category', 'owner'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('location', 'like', '%' . $search . '%');
            });
        }

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['condition'])) {
            $query->where('condition', $validated['condition']);
        }

        if (!empty($validated['location'])) {
            $query->where('location', 'like', '%' . $validated['location'] . '%');
        }

        switch ($validated['sort'] ?? 'newest') {
            case 'name':
                $query->orderBy('name');
                break;
            case 'oldest':
                $query->orderBy('created_at');
                break;
            case 'rating':
                $query->orderByDesc('reviews_avg_rating')->orderByDesc('reviews_count');
                break;
            case 'newest':
            default:
                $query->orderByDesc('created_at');
                break;
        }

        $items = $query->paginate($validated['per_page'] ?? 10);

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
     *     path="/api/my-items",
     *     tags={"Items"},
     *     summary="Get authenticated user's items",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="User items retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function myItems(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:available,borrowed,unavailable',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $query = Item::with(['category', 'owner'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $items = $query->paginate($validated['per_page'] ?? 10);

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
     * @OA\Post(
     *     path="/api/items",
     *     tags={"Items"},
     *     summary="Create a new item",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 required={"category_id","name","condition","location"},
     *                 @OA\Property(property="category_id", type="integer"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="condition", type="string", enum={"excellent","good","fair"}),
     *                 @OA\Property(property="location", type="string"),
     *                 @OA\Property(property="image", type="string", format="binary")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=201, description="Item created successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'condition' => 'required|in:excellent,good,fair',
            'location' => 'required|string|max:255',
        ]);

        $validated['user_id'] = $request->user()->id;

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('items', 'public');
        }

        $item = Item::create($validated);
        $item->load(['category', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data' => $this->formatItem($item),
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/items/{id}",
     *     tags={"Items"},
     *     summary="Get an item",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item retrieved successfully"),
     *     @OA\Response(response=404, description="Item not found")
     * )
     */
    public function show(Item $item)
    {
        $item->load(['category', 'owner', 'reviews.user:id,name']);
        $item->loadCount('reviews');
        $item->loadAvg('reviews', 'rating');

        return response()->json([
            'success' => true,
            'data' => $this->formatItem($item),
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/items/{id}",
     *     tags={"Items"},
     *     summary="Update an owned item",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item updated successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Not the item owner"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, Item $item)
    {
        if ($item->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to update this item.',
            ], 403);
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'condition' => 'sometimes|required|in:excellent,good,fair',
            'location' => 'sometimes|required|string|max:255',
        ]);

        if ($request->hasFile('image')) {
            if ($item->image && Storage::disk('public')->exists($item->image)) {
                Storage::disk('public')->delete($item->image);
            }

            $validated['image'] = $request->file('image')->store('items', 'public');
        }

        // Ownership is never accepted from client input.
        unset($validated['user_id']);

        $item->update($validated);
        $item->refresh()->load(['category', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data' => $this->formatItem($item),
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/items/{id}",
     *     tags={"Items"},
     *     summary="Delete an owned item",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item deleted successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Not the item owner")
     * )
     */
    public function destroy(Request $request, Item $item)
    {
        if ($item->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to delete this item.',
            ], 403);
        }

        $hasActiveBorrowing = $item->borrowings()
            ->whereIn('status', ['pending', 'approved', 'borrowed'])
            ->exists();

        if ($hasActiveBorrowing) {
            return response()->json([
                'success' => false,
                'message' => 'This item cannot be deleted while it has an active borrowing request or borrowing.',
            ], 409);
        }

        if ($item->image && Storage::disk('public')->exists($item->image)) {
            Storage::disk('public')->delete($item->image);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully',
        ]);
    }

    /**
     * Format item data consistently for API responses.
     */
    private function formatItem(Item $item): array
    {
        $data = $item->toArray();

        $data['image'] = $item->image
            ? asset('storage/' . $item->image)
            : null;

        // Item endpoints are public, so only expose the owner fields the UI needs.
        if ($item->relationLoaded('owner') && $item->owner) {
            $data['owner'] = [
                'id' => $item->owner->id,
                'name' => $item->owner->name,
            ];
        }

        return $data;
    }
}
