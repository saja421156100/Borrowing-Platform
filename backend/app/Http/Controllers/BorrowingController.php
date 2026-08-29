<?php

namespace App\Http\Controllers;

use App\Models\Borrowing;
use App\Models\Item;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BorrowingController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/borrowings",
     *     tags={"Borrowings - Admin"},
     *     summary="Get all borrowing requests",
     *     description="Admin only. Return all borrowing requests with item and user information.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Borrowing requests retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Admin access required")
     * )
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,approved,borrowed,returned,rejected',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Borrowing::with([
                'item:id,name,user_id',
                'item.owner:id,name',
                'user:id,name,email',
            ])
            ->latest();

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->whereHas('item', fn ($item) => $item->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($user) => $user->where('name', 'like', "%{$search}%"));
            });
        }

        $borrowings = $query->paginate($validated['per_page'] ?? 25);

        return response()->json([
            'success' => true,
            'data' => $borrowings->items(),
            'pagination' => [
                'current_page' => $borrowings->currentPage(),
                'last_page' => $borrowings->lastPage(),
                'per_page' => $borrowings->perPage(),
                'total' => $borrowings->total(),
            ],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/borrowings",
     *     tags={"Borrowings"},
     *     summary="Create a borrowing request",
     *     description="Create a new borrowing request for an available item using today or a future start date. A user cannot request their own item or send a duplicate active request.",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"item_id","borrowed_at","due_date"},
     *             @OA\Property(property="item_id", type="integer", example=1),
     *             @OA\Property(property="borrowed_at", type="string", format="date", example="2026-08-28"),
     *             @OA\Property(property="due_date", type="string", format="date", example="2026-08-30")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Borrowing request created successfully"),
     *     @OA\Response(response=400, description="Item unavailable, own item, or duplicate active request"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'borrowed_at' => 'required|date|after_or_equal:today',
            'due_date' => 'required|date|after_or_equal:borrowed_at',
        ]);

        $userId = auth()->id();

        $result = DB::transaction(function () use ($request, $userId) {
            // Lock the item so request creation and approval cannot race each other.
            $item = Item::whereKey($request->item_id)->lockForUpdate()->firstOrFail();

            if ((int) $item->user_id === (int) $userId) {
                return ['status' => 400, 'message' => 'You cannot borrow your own item.'];
            }

            if ($item->status !== 'available') {
                return ['status' => 400, 'message' => 'This item is not currently available for borrowing.'];
            }

            $duplicateRequest = Borrowing::where('item_id', $item->id)
                ->where('user_id', $userId)
                ->whereIn('status', ['pending', 'approved', 'borrowed'])
                ->exists();

            if ($duplicateRequest) {
                return ['status' => 400, 'message' => 'You already have an active borrowing request for this item.'];
            }

            $borrowing = Borrowing::create([
                'item_id' => $item->id,
                'user_id' => $userId,
                'borrowed_at' => $request->borrowed_at,
                'due_date' => $request->due_date,
                'status' => 'pending',
            ]);

            $borrowerName = auth()->user()?->name ?: 'A Borrowly member';
            $this->notifyBorrowing(
                $item->user_id,
                $userId,
                $borrowing,
                $item,
                'new_borrow_request',
                'New borrow request',
                $borrowerName . ' requested to borrow ' . $item->name . '.'
            );

            return [
                'status' => 201,
                'borrowing' => $borrowing->fresh(['item.owner', 'user']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Borrowing request created successfully.',
            'data' => $result['borrowing'],
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/received-borrow-requests",
     *     tags={"Borrowings - Owner"},
     *     summary="Get borrowing requests received for my items",
     *     description="Return requests made by other users for items owned by the authenticated user.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="status",
     *         in="query",
     *         required=false,
     *         description="Optional status filter",
     *         @OA\Schema(type="string", enum={"pending","approved","borrowed","returned","rejected"})
     *     ),
     *     @OA\Response(response=200, description="Received borrowing requests retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=422, description="Invalid status filter")
     * )
     */
    public function receivedRequests(Request $request)
    {
        $request->validate([
            'status' => 'nullable|in:pending,approved,borrowed,returned,rejected',
        ]);

        $borrowings = Borrowing::with(['user', 'item'])
            ->whereHas('item', function ($query) {
                $query->where('user_id', auth()->id());
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $borrowings,
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/borrowings/{id}/approve",
     *     tags={"Borrowings - Owner"},
     *     summary="Approve a borrowing request",
     *     description="Only the owner of the requested item can approve a pending request. Other pending requests for the same item are automatically rejected.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrowing request approved successfully"),
     *     @OA\Response(response=400, description="Request cannot be approved"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Only the item owner can approve this request"),
     *     @OA\Response(response=404, description="Borrowing request not found")
     * )
     */
    public function approve($id)
    {
        $borrowingSnapshot = Borrowing::find($id);

        if (!$borrowingSnapshot) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing request not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($id, $borrowingSnapshot) {
            // Always lock the item first. This keeps concurrent approvals for
            // the same item serialized and avoids conflicting owner actions.
            $item = Item::whereKey($borrowingSnapshot->item_id)->lockForUpdate()->first();
            $borrowing = Borrowing::whereKey($id)->lockForUpdate()->first();

            if (!$item || !$borrowing) {
                return ['status' => 404, 'message' => 'Borrowing request or item not found.'];
            }

            if ((int) $item->user_id !== (int) auth()->id()) {
                return ['status' => 403, 'message' => 'Only the item owner can approve this request.'];
            }

            if ($borrowing->status !== 'pending') {
                return ['status' => 400, 'message' => 'Only pending requests can be approved.'];
            }

            if ($item->status !== 'available') {
                return ['status' => 400, 'message' => 'This item is no longer available to approve.'];
            }

            $borrowing->update(['status' => 'approved']);

            // Reserve the item for the approved borrower until it is handed over.
            $item->update(['status' => 'unavailable']);

            $ownerName = auth()->user()?->name ?: 'The item owner';
            $this->notifyBorrowing(
                $borrowing->user_id,
                auth()->id(),
                $borrowing,
                $item,
                'borrowing_approved',
                'Borrowing approved',
                $ownerName . ' approved your request for ' . $item->name . '.'
            );

            // One item can only have one approved borrower at a time. Lock and
            // reject the remaining pending requests, notifying each borrower.
            $otherPending = Borrowing::where('item_id', $item->id)
                ->where('id', '!=', $borrowing->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->get();

            foreach ($otherPending as $otherRequest) {
                $otherRequest->update(['status' => 'rejected']);

                $this->notifyBorrowing(
                    $otherRequest->user_id,
                    auth()->id(),
                    $otherRequest,
                    $item,
                    'borrowing_rejected',
                    'Borrowing request closed',
                    'Another request for ' . $item->name . ' was approved, so your pending request was closed.'
                );
            }

            return [
                'status' => 200,
                'borrowing' => $borrowing->fresh(['user', 'item']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Borrowing request approved successfully.',
            'data' => $result['borrowing'],
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/borrowings/{id}/reject",
     *     tags={"Borrowings - Owner"},
     *     summary="Reject a borrowing request",
     *     description="Only the owner of the requested item can reject a pending request.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrowing request rejected successfully"),
     *     @OA\Response(response=400, description="Only pending requests can be rejected"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Only the item owner can reject this request"),
     *     @OA\Response(response=404, description="Borrowing request not found")
     * )
     */
    public function reject($id)
    {
        $borrowingSnapshot = Borrowing::find($id);

        if (!$borrowingSnapshot) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing request not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($id, $borrowingSnapshot) {
            $item = Item::whereKey($borrowingSnapshot->item_id)->lockForUpdate()->first();
            $borrowing = Borrowing::whereKey($id)->lockForUpdate()->first();

            if (!$item || !$borrowing) {
                return ['status' => 404, 'message' => 'Borrowing request or item not found.'];
            }

            if ((int) $item->user_id !== (int) auth()->id()) {
                return ['status' => 403, 'message' => 'Only the item owner can reject this request.'];
            }

            if ($borrowing->status !== 'pending') {
                return ['status' => 400, 'message' => 'Only pending requests can be rejected.'];
            }

            $borrowing->update(['status' => 'rejected']);

            $ownerName = auth()->user()?->name ?: 'The item owner';
            $this->notifyBorrowing(
                $borrowing->user_id,
                auth()->id(),
                $borrowing,
                $item,
                'borrowing_rejected',
                'Borrowing request declined',
                $ownerName . ' declined your request for ' . $item->name . '.'
            );

            return [
                'status' => 200,
                'borrowing' => $borrowing->fresh(['user', 'item']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Borrowing request rejected successfully.',
            'data' => $result['borrowing'],
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/borrowings/{id}/confirm-received",
     *     tags={"Borrowings"},
     *     summary="Borrower confirms receiving the item",
     *     description="Only the approved borrower can confirm that the item was physically received. This changes the borrowing from approved to borrowed and marks the item as borrowed.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item receipt confirmed successfully"),
     *     @OA\Response(response=400, description="Borrowing is not approved or item is not reserved"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Only the approved borrower can confirm receipt"),
     *     @OA\Response(response=404, description="Borrowing request not found")
     * )
     */
    public function confirmReceived($id)
    {
        $borrowingSnapshot = Borrowing::find($id);

        if (!$borrowingSnapshot) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing request not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($id, $borrowingSnapshot) {
            $item = Item::whereKey($borrowingSnapshot->item_id)->lockForUpdate()->first();
            $borrowing = Borrowing::whereKey($id)->lockForUpdate()->first();

            if (!$item || !$borrowing) {
                return ['status' => 404, 'message' => 'Borrowing request or item not found.'];
            }

            if ((int) $borrowing->user_id !== (int) auth()->id()) {
                return ['status' => 403, 'message' => 'Only the approved borrower can confirm receiving this item.'];
            }

            if ($borrowing->status !== 'approved') {
                return ['status' => 400, 'message' => 'Only approved borrowings can be confirmed as received.'];
            }

            if ($item->status !== 'unavailable') {
                return ['status' => 400, 'message' => 'This item is not currently reserved for handoff.'];
            }

            $borrowing->update(['status' => 'borrowed']);
            $item->update(['status' => 'borrowed']);

            $borrowerName = auth()->user()?->name ?: 'The borrower';
            $this->notifyBorrowing(
                $item->user_id,
                auth()->id(),
                $borrowing,
                $item,
                'item_received',
                'Item handoff confirmed',
                $borrowerName . ' confirmed receiving ' . $item->name . '.'
            );

            return [
                'status' => 200,
                'borrowing' => $borrowing->fresh(['user', 'item.owner']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Item receipt confirmed successfully.',
            'data' => $result['borrowing'],
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/borrowings/{id}/confirm-returned",
     *     tags={"Borrowings - Owner"},
     *     summary="Owner confirms the item was returned",
     *     description="Only the item owner can confirm that a borrowed item was returned. This changes the borrowing from borrowed to returned, records returned_at, and makes the item available again.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Item return confirmed successfully"),
     *     @OA\Response(response=400, description="Borrowing is not active or item is not marked borrowed"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Only the item owner can confirm the return"),
     *     @OA\Response(response=404, description="Borrowing request not found")
     * )
     */
    public function confirmReturned($id)
    {
        $borrowingSnapshot = Borrowing::find($id);

        if (!$borrowingSnapshot) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing request not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($id, $borrowingSnapshot) {
            $item = Item::whereKey($borrowingSnapshot->item_id)->lockForUpdate()->first();
            $borrowing = Borrowing::whereKey($id)->lockForUpdate()->first();

            if (!$item || !$borrowing) {
                return ['status' => 404, 'message' => 'Borrowing request or item not found.'];
            }

            if ((int) $item->user_id !== (int) auth()->id()) {
                return ['status' => 403, 'message' => 'Only the item owner can confirm that this item was returned.'];
            }

            if ($borrowing->status !== 'borrowed') {
                return ['status' => 400, 'message' => 'Only active borrowings can be confirmed as returned.'];
            }

            if ($item->status !== 'borrowed') {
                return ['status' => 400, 'message' => 'This item is not currently marked as borrowed.'];
            }

            $borrowing->update([
                'status' => 'returned',
                'returned_at' => now()->toDateString(),
            ]);
            $item->update(['status' => 'available']);

            $ownerName = auth()->user()?->name ?: 'The item owner';
            $this->notifyBorrowing(
                $borrowing->user_id,
                auth()->id(),
                $borrowing,
                $item,
                'item_returned',
                'Return confirmed',
                $ownerName . ' confirmed that ' . $item->name . ' was returned. You can now leave a review.'
            );

            return [
                'status' => 200,
                'borrowing' => $borrowing->fresh(['user', 'item']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Item return confirmed successfully.',
            'data' => $result['borrowing'],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/borrowings/{id}",
     *     tags={"Borrowings"},
     *     summary="Get a borrowing request",
     *     description="The borrower or the owner of the requested item can view the request.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrowing retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=404, description="Borrowing not found or unauthorized")
     * )
     */
    public function show($id)
    {
        $borrowing = Borrowing::with(['user', 'item.owner'])->find($id);

        if (!$borrowing) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing not found.',
            ], 404);
        }

        $userId = (int) auth()->id();
        $isBorrower = (int) $borrowing->user_id === $userId;
        $isOwner = (int) $borrowing->item->user_id === $userId;

        if (!$isBorrower && !$isOwner) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing not found or you are not authorized to view it.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $borrowing,
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/borrowings/{id}",
     *     tags={"Borrowings - Admin"},
     *     summary="Update borrowing status",
     *     description="Admin only. Update the status of a borrowing request.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"status"},
     *             @OA\Property(property="status", type="string", enum={"pending","approved","borrowed","returned","rejected"}, example="approved")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Borrowing updated successfully"),
     *     @OA\Response(response=400, description="Invalid status transition"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Admin access required"),
     *     @OA\Response(response=404, description="Borrowing not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,borrowed,returned,rejected',
        ]);

        $borrowingSnapshot = Borrowing::find($id);

        if (!$borrowingSnapshot) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($request, $id, $borrowingSnapshot) {
            $item = Item::whereKey($borrowingSnapshot->item_id)->lockForUpdate()->firstOrFail();
            $borrowing = Borrowing::whereKey($id)->lockForUpdate()->first();

            if (!$borrowing) {
                return ['status' => 404, 'message' => 'Borrowing not found.'];
            }

            $currentStatus = $borrowing->status;
            $newStatus = $request->status;

            $allowedTransitions = [
                'pending' => ['approved', 'rejected'],
                'approved' => ['borrowed'],
                'borrowed' => ['returned'],
                'returned' => [],
                'rejected' => [],
            ];

            if (!in_array($newStatus, $allowedTransitions[$currentStatus], true)) {
                return [
                    'status' => 400,
                    'message' => "Cannot change borrowing status from {$currentStatus} to {$newStatus}.",
                ];
            }

            $data = ['status' => $newStatus];

            if ($newStatus === 'approved') {
                if ($item->status !== 'available') {
                    return ['status' => 400, 'message' => 'This item is no longer available to approve.'];
                }

                $item->update(['status' => 'unavailable']);

                $otherPending = Borrowing::where('item_id', $item->id)
                    ->where('id', '!=', $borrowing->id)
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->get();

                foreach ($otherPending as $otherRequest) {
                    $otherRequest->update(['status' => 'rejected']);
                    $this->notifyBorrowing(
                        $otherRequest->user_id,
                        auth()->id(),
                        $otherRequest,
                        $item,
                        'borrowing_rejected',
                        'Borrowing request closed',
                        'Another request for ' . $item->name . ' was approved, so your pending request was closed.'
                    );
                }
            }

            if ($newStatus === 'borrowed') {
                $item->update(['status' => 'borrowed']);
            }

            if ($newStatus === 'returned') {
                $data['returned_at'] = now();
                $item->update(['status' => 'available']);
            }

            $borrowing->update($data);

            $adminName = auth()->user()?->name ?: 'A Borrowly administrator';

            if ($newStatus === 'approved') {
                $this->notifyBorrowing(
                    $borrowing->user_id, auth()->id(), $borrowing, $item,
                    'borrowing_approved', 'Borrowing approved',
                    $adminName . ' approved your request for ' . $item->name . '.'
                );
            } elseif ($newStatus === 'rejected') {
                $this->notifyBorrowing(
                    $borrowing->user_id, auth()->id(), $borrowing, $item,
                    'borrowing_rejected', 'Borrowing request declined',
                    $adminName . ' declined your request for ' . $item->name . '.'
                );
            } elseif ($newStatus === 'borrowed') {
                $this->notifyBorrowing(
                    $item->user_id, auth()->id(), $borrowing, $item,
                    'item_received', 'Item marked as received',
                    $adminName . ' marked ' . $item->name . ' as received by the borrower.'
                );
            } elseif ($newStatus === 'returned') {
                $this->notifyBorrowing(
                    $borrowing->user_id, auth()->id(), $borrowing, $item,
                    'item_returned', 'Return confirmed',
                    $adminName . ' confirmed the return of ' . $item->name . '.'
                );
            }

            return [
                'status' => 200,
                'borrowing' => $borrowing->fresh(['user', 'item']),
            ];
        });

        if (!isset($result['borrowing'])) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Borrowing status updated successfully.',
            'data' => $result['borrowing'],
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/borrowings/{id}",
     *     tags={"Borrowings - Admin"},
     *     summary="Delete a borrowing request",
     *     description="Admin only. Delete a borrowing request.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrowing deleted successfully"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Admin access required"),
     *     @OA\Response(response=404, description="Borrowing not found")
     * )
     */
    public function destroy($id)
    {
        $borrowing = Borrowing::find($id);

        if (!$borrowing) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing not found.',
            ], 404);
        }

        $borrowing->delete();

        return response()->json([
            'success' => true,
            'message' => 'Borrowing deleted successfully.',
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/my-borrowings",
     *     tags={"Borrowings"},
     *     summary="Get my borrowing requests",
     *     description="Return the borrowing requests of the authenticated user.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="User borrowing requests retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function myBorrowings()
    {
        $userId = (int) auth()->id();

        $borrowings = Borrowing::with([
                'item.owner',
                'item.reviews' => function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                },
            ])
            ->where('user_id', $userId)
            ->latest()
            ->get();

        $borrowings->each(function (Borrowing $borrowing) {
            $review = $borrowing->item?->reviews?->first();
            $borrowing->setAttribute('review', $review);

            if ($borrowing->item) {
                $borrowing->item->unsetRelation('reviews');
            }
        });

        return response()->json([
            'success' => true,
            'data' => $borrowings,
        ]);
    }

    private function notifyBorrowing(
        int $userId,
        ?int $actorId,
        Borrowing $borrowing,
        Item $item,
        string $type,
        string $title,
        string $message
    ): void {
        UserNotification::create([
            'user_id' => $userId,
            'actor_id' => $actorId,
            'borrowing_id' => $borrowing->id,
            'item_id' => $item->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
        ]);
    }

}
