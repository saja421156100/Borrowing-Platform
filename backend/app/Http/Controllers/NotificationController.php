<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/notifications",
     *     tags={"Notifications"},
     *     summary="Get my notifications",
     *     description="Return notifications belonging to the authenticated user, newest first.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="unread", in="query", required=false, @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer", minimum=1)),
     *     @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=50)),
     *     @OA\Response(response=200, description="Notifications retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function index(Request $request)
    {
        $request->validate([
            'unread' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $perPage = (int) $request->input('per_page', 15);

        $query = UserNotification::with([
                'actor:id,name',
                'item:id,name',
                'borrowing:id,item_id,user_id,status',
            ])
            ->where('user_id', auth()->id())
            ->latest();

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/notifications/unread-count",
     *     tags={"Notifications"},
     *     summary="Get unread notification count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Unread count retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function unreadCount()
    {
        $count = UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/notifications/{id}/read",
     *     tags={"Notifications"},
     *     summary="Mark one notification as read",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Notification marked as read"),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=404, description="Notification not found")
     * )
     */
    public function markRead($id)
    {
        $notification = UserNotification::where('user_id', auth()->id())->find($id);

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found.',
            ], 404);
        }

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => $notification->fresh(['actor:id,name', 'item:id,name']),
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/notifications/read-all",
     *     tags={"Notifications"},
     *     summary="Mark all notifications as read",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="All notifications marked as read"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function markAllRead()
    {
        $updated = UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
            'updated' => $updated,
        ]);
    }
}
