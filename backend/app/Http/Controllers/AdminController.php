<?php

namespace App\Http\Controllers;

use App\Models\Borrowing;
use App\Models\Item;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    /** @OA\Get(path="/api/admin/dashboard", tags={"Admin"}, summary="Get admin dashboard data", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Dashboard data")) */
    public function dashboard()
    {
        $today = Carbon::today();
        $chart = collect(range(13, 0))->map(function ($daysAgo) use ($today) {
            $date = $today->copy()->subDays($daysAgo);

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('M j'),
                'requests' => Borrowing::whereDate('created_at', $date)->count(),
                'completed' => Borrowing::where('status', 'returned')->whereDate('returned_at', $date)->count(),
            ];
        });

        $recentBorrowings = Borrowing::with(['user:id,name', 'item:id,name,user_id', 'item.owner:id,name'])
            ->latest()
            ->limit(5)
            ->get();

        $recentReports = Report::with(['reporter:id,name', 'reportedUser:id,name', 'item:id,name'])
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'users' => User::count(),
                    'items' => Item::count(),
                    'active_borrowings' => Borrowing::whereIn('status', ['approved', 'borrowed'])->count(),
                    'completed_borrowings' => Borrowing::where('status', 'returned')->count(),
                    'pending_requests' => Borrowing::where('status', 'pending')->count(),
                    'pending_reports' => Report::where('status', 'pending')->count(),
                    'reviews' => Review::count(),
                ],
                'chart' => $chart->values(),
                'recent_borrowings' => $recentBorrowings,
                'recent_reports' => $recentReports,
            ],
        ]);
    }

    /** @OA\Get(path="/api/admin/users", tags={"Admin"}, summary="List users", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Users")) */
    public function users(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'role' => 'nullable|in:user,admin',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = User::query()
            ->select(['id', 'name', 'email', 'phone', 'role', 'location', 'created_at'])
            ->withCount(['items', 'borrowings'])
            ->latest();

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        return $this->paginatedResponse($query->paginate($validated['per_page'] ?? 20));
    }

    /** @OA\Patch(path="/api/admin/users/{user}/role", tags={"Admin"}, summary="Change user role", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Role updated")) */
    public function updateUserRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['user', 'admin'])],
        ]);

        if ((int) $user->id === (int) $request->user()->id && $validated['role'] !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'You cannot remove your own admin access.',
            ], 409);
        }

        $user->update(['role' => $validated['role']]);

        return response()->json([
            'success' => true,
            'message' => 'User role updated.',
            'data' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    /** @OA\Delete(path="/api/admin/users/{user}", tags={"Admin"}, summary="Delete an unused user account", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="User deleted")) */
    public function destroyUser(Request $request, User $user)
    {
        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account from the admin panel.'], 409);
        }

        $hasHistory = $user->items()->exists()
            || $user->borrowings()->exists()
            || $user->reviews()->exists()
            || $user->reports()->exists();

        if ($hasHistory) {
            return response()->json([
                'success' => false,
                'message' => 'This user has marketplace history and cannot be deleted. Change their role if needed instead.',
            ], 409);
        }

        $user->delete();

        return response()->json(['success' => true, 'message' => 'User deleted.']);
    }

    /** @OA\Get(path="/api/admin/items", tags={"Admin"}, summary="List items for moderation", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Items")) */
    public function items(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|in:available,borrowed,unavailable',
            'category_id' => 'nullable|integer|exists:categories,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Item::with(['owner:id,name,email', 'category:id,name'])
            ->withCount('reviews')
            ->latest();

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) $query->where('status', $validated['status']);
        if (!empty($validated['category_id'])) $query->where('category_id', $validated['category_id']);

        $page = $query->paginate($validated['per_page'] ?? 20);
        $page->getCollection()->transform(function (Item $item) {
            $data = $item->toArray();
            $data['image'] = $item->image ? asset('storage/' . $item->image) : null;
            return $data;
        });

        return $this->paginatedResponse($page);
    }

    /** @OA\Delete(path="/api/admin/items/{item}", tags={"Admin"}, summary="Delete an item with no active borrowing", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Item deleted")) */
    public function destroyItem(Item $item)
    {
        if ($item->borrowings()->whereIn('status', ['pending', 'approved', 'borrowed'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This item has an active borrowing and cannot be deleted.',
            ], 409);
        }

        if ($item->image && Storage::disk('public')->exists($item->image)) {
            Storage::disk('public')->delete($item->image);
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted.']);
    }

    /** @OA\Get(path="/api/admin/reports", tags={"Admin"}, summary="List reports", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Reports")) */
    public function reports(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,resolved,dismissed',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Report::with([
                'reporter:id,name,email',
                'reportedUser:id,name,email',
                'item:id,name',
                'borrowing:id,status',
                'resolver:id,name',
            ])
            ->latest();

        if (!empty($validated['status'])) $query->where('status', $validated['status']);

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('type', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('reporter', fn ($user) => $user->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('reportedUser', fn ($user) => $user->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('item', fn ($item) => $item->where('name', 'like', "%{$search}%"));
            });
        }

        return $this->paginatedResponse($query->paginate($validated['per_page'] ?? 20));
    }

    /** @OA\Patch(path="/api/admin/reports/{report}", tags={"Admin"}, summary="Resolve or dismiss a report", security={{"bearerAuth":{}}}, @OA\Response(response=200, description="Report updated")) */
    public function updateReport(Request $request, Report $report)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,resolved,dismissed',
            'admin_note' => 'nullable|string|max:2000',
        ]);

        $data = [
            'status' => $validated['status'],
            'admin_note' => $validated['admin_note'] ?? $report->admin_note,
        ];

        if ($validated['status'] === 'pending') {
            $data['resolved_by'] = null;
            $data['resolved_at'] = null;
        } else {
            $data['resolved_by'] = $request->user()->id;
            $data['resolved_at'] = now();
        }

        $report->update($data);

        if ($validated['status'] !== 'pending') {
            UserNotification::create([
                'user_id' => $report->reporter_id,
                'actor_id' => $request->user()->id,
                'borrowing_id' => $report->borrowing_id,
                'item_id' => $report->item_id,
                'type' => $validated['status'] === 'resolved' ? 'report_resolved' : 'report_dismissed',
                'title' => $validated['status'] === 'resolved' ? 'Report resolved' : 'Report reviewed',
                'message' => $validated['status'] === 'resolved'
                    ? 'An administrator reviewed and resolved your report.'
                    : 'An administrator reviewed and dismissed your report.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Report updated.',
            'data' => $report->fresh(['reporter:id,name', 'reportedUser:id,name', 'item:id,name', 'resolver:id,name']),
        ]);
    }

    public function exportReports(Request $request): StreamedResponse
    {
        $reports = Report::with(['reporter:id,name,email', 'reportedUser:id,name,email', 'item:id,name'])
            ->latest()
            ->get();

        return response()->streamDownload(function () use ($reports) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Type', 'Reporter', 'Reported User', 'Item', 'Reason', 'Status', 'Admin Note', 'Created At']);

            foreach ($reports as $report) {
                fputcsv($out, [
                    $report->id,
                    $report->type,
                    $report->reporter?->name,
                    $report->reportedUser?->name,
                    $report->item?->name,
                    $report->reason,
                    $report->status,
                    $report->admin_note,
                    $report->created_at?->toDateTimeString(),
                ]);
            }
            fclose($out);
        }, 'borrowly-reports.csv', ['Content-Type' => 'text/csv']);
    }

    private function paginatedResponse($page)
    {
        return response()->json([
            'success' => true,
            'data' => $page->items(),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
