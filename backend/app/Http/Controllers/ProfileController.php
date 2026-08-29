<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/profile",
     *     tags={"Profile"},
     *     summary="Get the authenticated user's profile",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Profile returned successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function show(Request $request)
    {
        $user = $request->user();

        $itemsListed = $user->items()->count();
        $successfulBorrows = $user->borrowings()
            ->whereIn('status', ['approved', 'borrowed', 'returned'])
            ->count();

        $averageItemRating = Review::query()
            ->whereHas('item', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->avg('rating');

        return response()->json([
            'user' => $user,
            'stats' => [
                'items_listed' => $itemsListed,
                'borrows' => $successfulBorrows,
                'average_item_rating' => $averageItemRating !== null
                    ? round((float) $averageItemRating, 1)
                    : null,
            ],
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/profile",
     *     tags={"Profile"},
     *     summary="Update the authenticated user's profile",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Sara Ahmed"),
     *             @OA\Property(property="email", type="string", format="email", example="sara@example.com"),
     *             @OA\Property(property="phone", type="string", nullable=true, example="+970599123456"),
     *             @OA\Property(property="location", type="string", nullable=true, example="Ramallah"),
     *             @OA\Property(property="bio", type="string", nullable=true, example="Happy to share useful items with my community.")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Profile updated successfully"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        foreach (['phone', 'location', 'bio'] as $field) {
            if (array_key_exists($field, $data) && is_string($data[$field])) {
                $data[$field] = trim($data[$field]) === '' ? null : trim($data[$field]);
            }
        }

        $user->fill($data);
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(),
        ]);
    }
}
