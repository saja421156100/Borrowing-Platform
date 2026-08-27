<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    /**
     * Display a listing of items.
     */

    /**
     * @OA\Get(
     *     path="/api/items",
     *     tags={"Items"},
     *     summary="Get all items",
     *     description="Get items with search, filtering, sorting and pagination.",
     *
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         required=false,
     *         description="Search by item name or description",
     *         @OA\Schema(type="string"),
     *         example="Laptop"
     *     ),
     *
     *     @OA\Parameter(
     *         name="category_id",
     *         in="query",
     *         required=false,
     *         description="Filter items by category",
     *         @OA\Schema(type="integer"),
     *         example=1
     *     ),
     *
     *     @OA\Parameter(
     *         name="status",
     *         in="query",
     *         required=false,
     *         description="Filter items by status",
     *         @OA\Schema(
     *             type="string",
     *             enum={"available", "borrowed"}
     *         ),
     *         example="available"
     *     ),
     *
     *     @OA\Parameter(
     *         name="sort",
     *         in="query",
     *         required=false,
     *         description="Sort items",
     *         @OA\Schema(type="string", enum={"name", "newest", "oldest"}),
     *         example="name"
     *     ),
     *
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         required=false,
     *         description="Page number",
     *         @OA\Schema(type="integer"),
     *         example=1
     *     ),
     *
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         required=false,
     *         description="Number of items per page",
     *         @OA\Schema(type="integer", minimum=1, maximum=50),
     *         example=10
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Items retrieved successfully"
     *     )
     * )
     */
    public function index(Request $request)
{
    $request->validate([
        'search' => 'nullable|string|max:255',
        'category_id' => 'nullable|integer|exists:categories,id',
        'status' => 'nullable|in:available,borrowed',
        'sort' => 'nullable|in:name,newest,oldest',
        'per_page' => 'nullable|integer|min:1|max:50',
    ]);

    $query = Item::with(['category', 'owner']);

    // Search by name or description
    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', '%' . $search . '%')
              ->orWhere('description', 'like', '%' . $search . '%');
        });
    }

    // Filter by category
    if ($request->filled('category_id')) {
        $query->where('category_id', $request->category_id);
    }

    // Filter by status
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    // Sorting
    switch ($request->sort) {
        case 'name':
            $query->orderBy('name', 'asc');
            break;

        case 'oldest':
            $query->orderBy('created_at', 'asc');
            break;

        case 'newest':
        default:
            $query->orderBy('created_at', 'desc');
            break;
    }

    // Pagination
    $perPage = $request->input('per_page', 10);

    $items = $query->paginate($perPage);

    // Convert image path to full URL
    $items->getCollection()->transform(function ($item) {

        if ($item->image) {
            $item->image = asset('storage/' . $item->image);
        }

        return $item;
    });

    return response()->json([
        'success' => true,
        'data' => $items->items(),
        'pagination' => [
            'current_page' => $items->currentPage(),
            'last_page' => $items->lastPage(),
            'per_page' => $items->perPage(),
            'total' => $items->total(),
        ]
    ]);
}


    /**
     * Store a newly created item.
     */

    /**
 * @OA\Post(
 *     path="/api/items",
 *     tags={"Items"},
 *     summary="Create a new item",
 *     description="Create a new item for borrowing.",
 *
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\MediaType(
 *             mediaType="multipart/form-data",
 *             @OA\Schema(
 *                 required={"category_id", "name"},
 *
 *                 @OA\Property(
 *                     property="category_id",
 *                     type="integer",
 *                     example=1
 *                 ),
 *
 *                 @OA\Property(
 *                     property="name",
 *                     type="string",
 *                     example="Laptop Dell"
 *                 ),
 *
 *                 @OA\Property(
 *                     property="description",
 *                     type="string",
 *                     example="Dell laptop available for borrowing"
 *                 ),
 *
 *                 @OA\Property(
 *                     property="image",
 *                     type="string",
 *                     format="binary"
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Item created successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
public function store(Request $request)
{
    $validated = $request->validate([
        'category_id' => 'required|exists:categories,id',
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
        'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        'status' => 'nullable|in:available,borrowed,unavailable',
    ]);

    // Get the authenticated user from JWT
    $user = auth()->user();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated'
        ], 401);
    }

    $validated['user_id'] = $user->id;

    // Upload image
    if ($request->hasFile('image')) {
        $validated['image'] = $request->file('image')
            ->store('items', 'public');
    }

    $item = Item::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Item created successfully',
        'data' => [
            'id' => $item->id,
            'category_id' => $item->category_id,
            'user_id' => $item->user_id,
            'name' => $item->name,
            'description' => $item->description,
            'image' => $item->image
                ? asset('storage/' . $item->image)
                : null,
            'status' => $item->status,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ]
    ], 201);
}
    /*public function store(Request $request)
{
    $validated = $request->validate([
        'category_id' => 'required|exists:categories,id',
        'user_id' => 'required|exists:users,id',
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
        'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        'status' => 'nullable|in:available,borrowed,unavailable',
    ]);

    // Upload image
    if ($request->hasFile('image')) {
        $validated['image'] = $request->file('image')
            ->store('items', 'public');
    }

    $item = Item::create($validated);

    // Return image URL
    if ($item->image) {
        $item->image = asset('storage/' . $item->image);
    }

    return response()->json([
        'success' => true,
        'message' => 'Item created successfully',
        'data' => $item
    ], 201);
}*/

    /**
     * Display the specified item.
     */

    /**
     * @OA\Get(
     *     path="/api/items/{id}",
     *     tags={"Items"},
     *     summary="Get an item",
     *     description="Get details of a specific item.",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Item ID",
     *         @OA\Schema(type="integer"),
     *         example=1
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Item retrieved successfully"
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="Item not found"
     *     )
     * )
     */
    public function show(Item $item)
{
    $item->load(['category', 'owner', 'reviews']);

    if ($item->image) {
        $item->image = asset('storage/' . $item->image);
    }

    return response()->json([
        'success' => true,
        'data' => $item
    ]);
}


    /**
     * Update the specified item.
     */

   /**
 * @OA\Post(
 *     path="/api/items/{id}",
 *     tags={"Items"},
 *     summary="Update an item",
 *     description="Update an existing item.",
 *
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Item ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\MediaType(
 *             mediaType="multipart/form-data",
 *             @OA\Schema(
 *
 * 
 * 
 *                 @OA\Property(
 *                   property="_method",
 *                   type="string",
 *                   example="PUT"
 *           ),
 *                 @OA\Property(
 *                     property="category_id",
 *                     type="integer",
 *                     example=1
 *                 ),
 *
 *                 @OA\Property(
 *                     property="name",
 *                     type="string",
 *                     example="Updated Laptop Dell"
 *                 ),
 *
 *                 @OA\Property(
 *                     property="description",
 *                     type="string",
 *                     example="Updated laptop description"
 *                 ),
 *
 *                 @OA\Property(
 *                     property="image",
 *                     type="string",
 *                     format="binary"
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Item updated successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Item not found"
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
    public function update(Request $request, Item $item)
{
    $validated = $request->validate([
        'category_id' => 'sometimes|required|exists:categories,id',
        'user_id' => 'sometimes|required|exists:users,id',
        'name' => 'sometimes|required|string|max:255',
        'description' => 'nullable|string',
        'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        'status' => 'sometimes|in:available,borrowed,unavailable',
    ]);

    // If a new image was uploaded
    if ($request->hasFile('image')) {

        // Delete old image
        if ($item->image && Storage::disk('public')->exists($item->image)) {
            Storage::disk('public')->delete($item->image);
        }

        // Store new image
        $validated['image'] = $request->file('image')
            ->store('items', 'public');
    }

    $item->update($validated);

    $item->refresh();

    return response()->json([
        'success' => true,
        'message' => 'Item updated successfully',
        'data' => [
            'id' => $item->id,
            'category_id' => $item->category_id,
            'user_id' => $item->user_id,
            'name' => $item->name,
            'description' => $item->description,
            'image' => $item->image
                ? asset('storage/' . $item->image)
                : null,
            'status' => $item->status,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ]
    ]);
}


    /**
     * Remove the specified item.
     */

    /**
     * @OA\Delete(
     *     path="/api/items/{id}",
     *     tags={"Items"},
     *     summary="Delete an item",
     *     description="Delete an existing item and its image.",
     *
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Item ID",
     *         @OA\Schema(type="integer"),
     *         example=1
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Item deleted successfully"
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="Item not found"
     *     )
     * )
     */
    public function destroy(Item $item)
{
    if ($item->image && Storage::disk('public')->exists($item->image)) {
        Storage::disk('public')->delete($item->image);
    }

    $item->delete();

    return response()->json([
        'success' => true,
        'message' => 'Item and its image deleted successfully'
    ]);
}


    /**
     * Format item response.
     */
    private function formatItem($item)
    {
        $data = $item->toArray();

        $data['image'] = $item->image
            ? asset('storage/' . $item->image)
            : null;

        return $data;
    }
}