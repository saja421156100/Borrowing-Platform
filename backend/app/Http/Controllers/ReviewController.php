<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Item;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    
 /**
 * @OA\Get(
 *     path="/api/reviews",
 *     tags={"Reviews"},
 *     summary="Get all reviews",
 *     description="Return all reviews.",
 *
 *     @OA\Response(
 *         response=200,
 *         description="Reviews retrieved successfully"
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/items/{itemId}/reviews",
 *     tags={"Reviews"},
 *     summary="Get reviews for an item",
 *     description="Return all reviews for a specific item.",
 *
 *     @OA\Parameter(
 *         name="itemId",
 *         in="path",
 *         required=true,
 *         description="Item ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Reviews retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Item not found"
 *     )
 * )
 */
    public function index($itemId = null)
    {
        // If itemId is provided, check that the item exists
        if ($itemId !== null) {
            $item = Item::find($itemId);

            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Item not found.'
                ], 404);
            }
        }

        $query = Review::with(['user', 'item']);

        if ($itemId !== null) {
            $query->where('item_id', $itemId);
        }

        $reviews = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $reviews
        ]);
    }


    /**
     * Create a review.
     */

    /**
 * @OA\Post(
 *     path="/api/reviews",
 *     tags={"Reviews"},
 *     summary="Create a review",
 *     description="Create a review for an item that the authenticated user has borrowed and returned.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"item_id","rating"},
 *
 *             @OA\Property(
 *                 property="item_id",
 *                 type="integer",
 *                 example=1
 *             ),
 *
 *             @OA\Property(
 *                 property="rating",
 *                 type="integer",
 *                 minimum=1,
 *                 maximum=5,
 *                 example=5
 *             ),
 *
 *             @OA\Property(
 *                 property="comment",
 *                 type="string",
 *                 nullable=true,
 *                 example="Great item, very useful."
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Review created successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="User has not returned the item"
 *     ),
 *
 *     @OA\Response(
 *         response=409,
 *         description="User has already reviewed this item"
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
        $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $user = auth()->user();

        // Check if the user has borrowed and returned the item
        $hasBorrowed = $user->borrowings()
            ->where('item_id', $request->item_id)
            ->where('status', 'returned')
            ->exists();

        if (!$hasBorrowed) {
            return response()->json([
                'success' => false,
                'message' => 'You can only review an item you have borrowed and returned.'
            ], 403);
        }

        // Prevent duplicate reviews
        $alreadyReviewed = Review::where('user_id', $user->id)
            ->where('item_id', $request->item_id)
            ->exists();

        if ($alreadyReviewed) {
            return response()->json([
                'success' => false,
                'message' => 'You have already reviewed this item.'
            ], 409);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'item_id' => $request->item_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        $review->load(['user', 'item']);

        return response()->json([
            'success' => true,
            'message' => 'Review created successfully.',
            'data' => $review
        ], 201);
    }


    /**
     * Display a specific review.
     */

    /**
 * @OA\Get(
 *     path="/api/reviews/{id}",
 *     tags={"Reviews"},
 *     summary="Get a specific review",
 *     description="Return details of a specific review.",
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Review ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Review retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Review not found"
 *     )
 * )
 */
    public function show($id)
    {
        $review = Review::with(['user', 'item'])->find($id);

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Review not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }


    /**
     * Update user's own review.
     */


    /**
 * @OA\Put(
 *     path="/api/reviews/{id}",
 *     tags={"Reviews"},
 *     summary="Update a review",
 *     description="Update a review belonging to the authenticated user.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Review ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *
 *             @OA\Property(
 *                 property="rating",
 *                 type="integer",
 *                 minimum=1,
 *                 maximum=5,
 *                 example=4
 *             ),
 *
 *             @OA\Property(
 *                 property="comment",
 *                 type="string",
 *                 nullable=true,
 *                 example="Very useful item."
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Review updated successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Review not found or unauthorized"
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
    public function update(Request $request, $id)
{
    $request->validate([
        'rating' => 'sometimes|integer|min:1|max:5',
        'comment' => 'sometimes|nullable|string|max:1000',
    ]);

    $review = Review::where('id', $id)
        ->where('user_id', auth()->id())
        ->first();

    if (!$review) {
        return response()->json([
            'success' => false,
            'message' => 'Review not found or you are not authorized to update it.'
        ], 404);
    }

    $review->update([
        'rating' => $request->rating ?? $review->rating,
        'comment' => $request->has('comment')
            ? $request->comment
            : $review->comment,
    ]);

    $review->load(['user', 'item']);

    return response()->json([
        'success' => true,
        'message' => 'Review updated successfully.',
        'data' => $review
    ]);
}


    /**
     * Delete user's own review.
     */

    /**
 * @OA\Delete(
 *     path="/api/reviews/{id}",
 *     tags={"Reviews"},
 *     summary="Delete my review",
 *     description="Delete a review belonging to the authenticated user.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Review ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Review deleted successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Review not found or unauthorized"
 *     )
 * )
 */
    public function destroy($id)
    {
        $review = Review::where('id', $id)
            ->where('user_id', auth()->id())
            ->first();

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Review not found or you are not authorized to delete it.'
            ], 404);
        }

        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully.'
        ]);
    }
}