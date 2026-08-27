<?php

namespace App\Http\Controllers;

use App\Models\Borrowing;
use App\Models\Item;
use Illuminate\Http\Request;

class BorrowingController extends Controller
{

/**
 * @OA\Get(
 *     path="/api/borrowings",
 *     tags={"Borrowings - Admin"},
 *     summary="Get all borrowing requests",
 *     description="Admin only. Return all borrowing requests with item and user information.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Borrowing requests retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Admin access required"
 *     )
 * )
 */
    public function index()
{
    $borrowings = Borrowing::with(['item', 'user'])
        ->latest()
        ->get();

    return response()->json([
        'success' => true,
        'data' => $borrowings
    ]);
}



/**
 * @OA\Post(
 *     path="/api/borrowings",
 *     tags={"Borrowings"},
 *     summary="Create a borrowing request",
 *     description="Create a new borrowing request for an item.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"item_id","user_id","borrowed_at","due_date"},
 *
 *             @OA\Property(
 *                 property="item_id",
 *                 type="integer",
 *                 example=1
 *             ),
 *
 *             @OA\Property(
 *                 property="user_id",
 *                 type="integer",
 *                 example=2
 *             ),
 *
 *             @OA\Property(
 *                 property="borrowed_at",
 *                 type="string",
 *                 format="date",
 *                 example="2026-08-28"
 *             ),
 *
 *             @OA\Property(
 *                 property="due_date",
 *                 type="string",
 *                 format="date",
 *                 example="2026-08-30"
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Borrowing request created successfully"
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
    $request->validate([
        'item_id' => 'required|exists:items,id',
        'borrowed_at' => 'required|date',
        'due_date' => 'required|date|after_or_equal:borrowed_at',
    ]);

    $item = Item::findOrFail($request->item_id);

    // Check if the item is currently borrowed
    if ($item->status === 'borrowed') {
        return response()->json([
            'message' => 'This item is currently borrowed and cannot be requested.'
        ], 400);
    }

    // Check if there is already a pending request
    $pendingBorrowing = Borrowing::where('item_id', $request->item_id)
        ->where('status', 'pending')
        ->exists();

    if ($pendingBorrowing) {
        return response()->json([
            'message' => 'This item already has a pending borrowing request.'
        ], 400);
    }

    $borrowing = Borrowing::create([
        'item_id' => $request->item_id,
        'user_id' => auth()->id(),
        'borrowed_at' => $request->borrowed_at,
        'due_date' => $request->due_date,
        'status' => 'pending',
    ]);

    return response()->json([
        'message' => 'Borrowing request created successfully',
        'borrowing' => $borrowing
    ], 201);
}



/**
 * @OA\Get(
 *     path="/api/borrowings/{id}",
 *     tags={"Borrowings"},
 *     summary="Get a borrowing request",
 *     description="Get a specific borrowing request. Users can only view their own requests.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Borrowing ID",
 *         @OA\Schema(type="integer"),
 *         example=4
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Borrowing retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Borrowing not found"
 *     )
 * )
 */
    public function show($id)
{
    $borrowing = Borrowing::with(['user', 'item'])
        ->where('id', $id)
        ->where('user_id', auth()->id())
        ->first();

    if (!$borrowing) {
        return response()->json([
            'success' => false,
            'message' => 'Borrowing not found or you are not authorized to view it.'
        ], 404);
    }

    return response()->json([
        'success' => true,
        'data' => $borrowing
    ]);
}




/**
 * @OA\Put(
 *     path="/api/borrowings/{id}",
 *     tags={"Borrowings - Admin"},
 *     summary="Update borrowing status",
 *     description="Admin only. Update the status of a borrowing request.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Borrowing ID",
 *         @OA\Schema(type="integer"),
 *         example=4
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"status"},
 *
 *             @OA\Property(
 *                 property="status",
 *                 type="string",
 *                 enum={"pending","approved","borrowed","returned","rejected"},
 *                 example="approved"
 *             ),
 *
 *             @OA\Property(
 *                 property="returned_at",
 *                 type="string",
 *                 format="date",
 *                 nullable=true,
 *                 example=null
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Borrowing updated successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Admin access required"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Borrowing not found"
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
    $borrowing = Borrowing::find($id);

    if (!$borrowing) {
        return response()->json([
            'success' => false,
            'message' => 'Borrowing not found.'
        ], 404);
    }

    $request->validate([
        'status' => 'required|in:pending,approved,borrowed,returned,rejected',
    ]);

    $currentStatus = $borrowing->status;
    $newStatus = $request->status;

    // Allowed status transitions
    $allowedTransitions = [
        'pending' => ['approved', 'rejected'],
        'approved' => ['borrowed'],
        'borrowed' => ['returned'],
        'returned' => [],
        'rejected' => [],
    ];

    if (!in_array($newStatus, $allowedTransitions[$currentStatus])) {
        return response()->json([
            'success' => false,
            'message' => "Cannot change borrowing status from {$currentStatus} to {$newStatus}."
        ], 400);
    }

    $item = Item::findOrFail($borrowing->item_id);

    $data = [
        'status' => $newStatus,
    ];

    // Approved
    if ($newStatus === 'approved') {
        $item->update([
            'status' => 'available'
        ]);
    }

    // Borrowed
    if ($newStatus === 'borrowed') {
        $item->update([
            'status' => 'borrowed'
        ]);
    }

    // Returned
    if ($newStatus === 'returned') {
        $data['returned_at'] = now();

        $item->update([
            'status' => 'available'
        ]);
    }

    // Rejected
    if ($newStatus === 'rejected') {
        $item->update([
            'status' => 'available'
        ]);
    }

    $borrowing->update($data);

    return response()->json([
        'success' => true,
        'message' => 'Borrowing status updated successfully.',
        'data' => $borrowing
    ]);
}




/**
 * @OA\Delete(
 *     path="/api/borrowings/{id}",
 *     tags={"Borrowings - Admin"},
 *     summary="Delete a borrowing request",
 *     description="Admin only. Delete a borrowing request.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Borrowing ID",
 *         @OA\Schema(type="integer"),
 *         example=4
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Borrowing deleted successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Admin access required"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Borrowing not found"
 *     )
 * )
 */
    public function destroy($id)
{
    $borrowing = Borrowing::find($id);

    if (!$borrowing) {
        return response()->json([
            'success' => false,
            'message' => 'Borrowing not found.'
        ], 404);
    }

    $borrowing->delete();

    return response()->json([
        'success' => true,
        'message' => 'Borrowing deleted successfully.'
    ]);
}


/**
 * @OA\Get(
 *     path="/api/my-borrowings",
 *     tags={"Borrowings"},
 *     summary="Get my borrowing requests",
 *     description="Return the borrowing requests of the authenticated user.",
 *     security={{"bearerAuth":{}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="User borrowing requests retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
    public function myBorrowings()
{
    $borrowings = Borrowing::with('item')
        ->where('user_id', auth()->id())
        ->latest()
        ->get();

    return response()->json([
        'success' => true,
        'data' => $borrowings
    ]);
}
}