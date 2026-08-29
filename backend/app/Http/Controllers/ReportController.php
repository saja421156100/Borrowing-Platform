<?php

namespace App\Http\Controllers;

use App\Models\Borrowing;
use App\Models\Item;
use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/reports",
     *     tags={"Reports"},
     *     summary="Submit a report",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"type","reason"},
     *         @OA\Property(property="item_id", type="integer", nullable=true),
     *         @OA\Property(property="borrowing_id", type="integer", nullable=true),
     *         @OA\Property(property="type", type="string", example="incorrect_item"),
     *         @OA\Property(property="reason", type="string", example="The listing is misleading.")
     *     )),
     *     @OA\Response(response=201, description="Report submitted"),
     *     @OA\Response(response=403, description="Not authorized for this report target"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'nullable|integer|exists:items,id|required_without:borrowing_id|prohibits:borrowing_id',
            'borrowing_id' => 'nullable|integer|exists:borrowings,id|required_without:item_id|prohibits:item_id',
            'type' => 'required|string|in:incorrect_item,inappropriate_listing,damaged_item,item_not_returned,inappropriate_behavior,other',
            'reason' => 'required|string|min:10|max:2000',
        ]);

        $userId = (int) $request->user()->id;
        $item = null;
        $borrowing = null;
        $reportedUserId = null;

        if (!empty($validated['borrowing_id'])) {
            if (!in_array($validated['type'], ['damaged_item', 'item_not_returned', 'inappropriate_behavior', 'other'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Choose a borrowing-related report type for this issue.',
                ], 422);
            }

            $borrowing = Borrowing::with('item:id,user_id')->findOrFail($validated['borrowing_id']);
            $ownerId = (int) $borrowing->item->user_id;
            $borrowerId = (int) $borrowing->user_id;

            if ($userId !== $ownerId && $userId !== $borrowerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not part of this borrowing.',
                ], 403);
            }

            $item = $borrowing->item;
            $reportedUserId = $userId === $ownerId ? $borrowerId : $ownerId;
        } else {
            if (!in_array($validated['type'], ['incorrect_item', 'inappropriate_listing', 'other'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Choose a listing-related report type for this item.',
                ], 422);
            }

            $item = Item::findOrFail($validated['item_id']);

            if ((int) $item->user_id === $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot report your own item.',
                ], 403);
            }

            $reportedUserId = (int) $item->user_id;
        }

        $duplicate = Report::where('reporter_id', $userId)
            ->where('status', 'pending')
            ->when($borrowing, fn ($query) => $query->where('borrowing_id', $borrowing->id))
            ->when(!$borrowing && $item, fn ($query) => $query->whereNull('borrowing_id')->where('item_id', $item->id))
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending report for this issue.',
            ], 409);
        }

        $report = Report::create([
            'reporter_id' => $userId,
            'reported_user_id' => $reportedUserId,
            'item_id' => $item?->id,
            'borrowing_id' => $borrowing?->id,
            'type' => $validated['type'],
            'reason' => trim($validated['reason']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Report submitted. An administrator can now review it.',
            'data' => $report,
        ], 201);
    }
}
