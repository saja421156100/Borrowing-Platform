<?php

namespace App\Http\Controllers;

use App\Models\Borrowing;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    private function isParticipant(Conversation $conversation, int $userId): bool
    {
        return (int) $conversation->borrower_id === $userId
            || (int) $conversation->owner_id === $userId;
    }

    private function conversationPayload(Conversation $conversation, int $userId): array
    {
        $conversation->loadMissing([
            'borrower:id,name',
            'owner:id,name',
            'item:id,name,image',
            'borrowing:id,item_id,user_id,status,borrowed_at,due_date,returned_at',
            'lastMessage.sender:id,name',
        ]);

        $counterpart = (int) $conversation->borrower_id === $userId
            ? $conversation->owner
            : $conversation->borrower;

        $unreadCount = ConversationMessage::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();

        return [
            'id' => $conversation->id,
            'borrowing_id' => $conversation->borrowing_id,
            'item_id' => $conversation->item_id,
            'item' => $conversation->item ? [
                'id' => $conversation->item->id,
                'name' => $conversation->item->name,
                'image' => $conversation->item->image,
            ] : null,
            'borrowing' => $conversation->borrowing ? [
                'id' => $conversation->borrowing->id,
                'status' => $conversation->borrowing->status,
                'borrowed_at' => $conversation->borrowing->borrowed_at?->toDateString(),
                'due_date' => $conversation->borrowing->due_date?->toDateString(),
                'returned_at' => $conversation->borrowing->returned_at?->toDateString(),
            ] : null,
            'counterpart' => $counterpart ? [
                'id' => $counterpart->id,
                'name' => $counterpart->name,
            ] : null,
            'last_message' => $conversation->lastMessage ? [
                'id' => $conversation->lastMessage->id,
                'body' => $conversation->lastMessage->body,
                'sender_id' => $conversation->lastMessage->sender_id,
                'created_at' => $conversation->lastMessage->created_at?->toISOString(),
            ] : null,
            'unread_count' => $unreadCount,
            'updated_at' => $conversation->updated_at?->toISOString(),
        ];
    }

    /**
     * @OA\Get(
     *     path="/api/conversations",
     *     tags={"Messages"},
     *     summary="Get my conversations",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer", minimum=1)),
     *     @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=50)),
     *     @OA\Response(response=200, description="Conversations retrieved successfully"),
     *     @OA\Response(response=401, description="Unauthenticated")
     * )
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:120',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $userId = (int) auth()->id();
        $search = trim((string) $request->input('search', ''));
        $perPage = (int) $request->input('per_page', 20);

        $query = Conversation::with([
                'borrower:id,name',
                'owner:id,name',
                'item:id,name,image',
                'borrowing:id,item_id,user_id,status,borrowed_at,due_date,returned_at',
                'lastMessage.sender:id,name',
            ])
            ->where(function ($q) use ($userId) {
                $q->where('borrower_id', $userId)
                    ->orWhere('owner_id', $userId);
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('borrower', fn ($user) => $user->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('owner', fn ($user) => $user->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('item', fn ($item) => $item->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('messages', fn ($message) => $message->where('body', 'like', "%{$search}%"));
            });
        }

        $conversations = $query->latest('updated_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => collect($conversations->items())
                ->map(fn (Conversation $conversation) => $this->conversationPayload($conversation, $userId))
                ->values(),
            'pagination' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/borrowings/{id}/conversation",
     *     tags={"Messages"},
     *     summary="Open or create the conversation for a borrowing",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Conversation ready"),
     *     @OA\Response(response=403, description="Not a participant"),
     *     @OA\Response(response=404, description="Borrowing not found")
     * )
     */
    public function openFromBorrowing($id)
    {
        $userId = (int) auth()->id();
        $borrowing = Borrowing::with('item:id,user_id,name,image')->find($id);

        if (!$borrowing || !$borrowing->item) {
            return response()->json([
                'success' => false,
                'message' => 'Borrowing not found.',
            ], 404);
        }

        $ownerId = (int) $borrowing->item->user_id;
        $borrowerId = (int) $borrowing->user_id;

        if ($userId !== $ownerId && $userId !== $borrowerId) {
            return response()->json([
                'success' => false,
                'message' => 'You are not part of this borrowing.',
            ], 403);
        }

        $conversation = Conversation::firstOrCreate(
            ['borrowing_id' => $borrowing->id],
            [
                'item_id' => $borrowing->item_id,
                'borrower_id' => $borrowerId,
                'owner_id' => $ownerId,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation, $userId),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/conversations/{conversation}",
     *     tags={"Messages"},
     *     summary="Get one conversation",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="conversation", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Conversation retrieved"),
     *     @OA\Response(response=403, description="Not a participant")
     * )
     */
    public function show(Conversation $conversation)
    {
        $userId = (int) auth()->id();

        if (!$this->isParticipant($conversation, $userId)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not part of this conversation.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation, $userId),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/conversations/{conversation}/messages",
     *     tags={"Messages"},
     *     summary="Get messages in a conversation",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="conversation", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="limit", in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=100)),
     *     @OA\Response(response=200, description="Messages retrieved"),
     *     @OA\Response(response=403, description="Not a participant")
     * )
     */
    public function messages(Request $request, Conversation $conversation)
    {
        $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $userId = (int) auth()->id();

        if (!$this->isParticipant($conversation, $userId)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not part of this conversation.',
            ], 403);
        }

        ConversationMessage::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $limit = (int) $request->input('limit', 100);
        $messages = ConversationMessage::with('sender:id,name')
            ->where('conversation_id', $conversation->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $messages->map(fn (ConversationMessage $message) => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'sender' => $message->sender ? [
                    'id' => $message->sender->id,
                    'name' => $message->sender->name,
                ] : null,
                'body' => $message->body,
                'read_at' => $message->read_at?->toISOString(),
                'created_at' => $message->created_at?->toISOString(),
            ])->values(),
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/conversations/{conversation}/messages",
     *     tags={"Messages"},
     *     summary="Send a message",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="conversation", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"body"}, @OA\Property(property="body", type="string", example="What time works for the handoff?"))),
     *     @OA\Response(response=201, description="Message sent"),
     *     @OA\Response(response=403, description="Not a participant"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function send(Request $request, Conversation $conversation)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $userId = (int) auth()->id();

        if (!$this->isParticipant($conversation, $userId)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not part of this conversation.',
            ], 403);
        }

        $body = trim((string) $request->input('body'));

        if ($body === '') {
            return response()->json([
                'success' => false,
                'message' => 'Message cannot be empty.',
            ], 422);
        }

        $message = DB::transaction(function () use ($conversation, $userId, $body) {
            $created = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $userId,
                'body' => $body,
            ]);

            $conversation->touch();

            return $created;
        });

        $message->load('sender:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Message sent.',
            'data' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'sender' => [
                    'id' => $message->sender->id,
                    'name' => $message->sender->name,
                ],
                'body' => $message->body,
                'read_at' => null,
                'created_at' => $message->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/messages/unread-count",
     *     tags={"Messages"},
     *     summary="Get unread message count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Unread message count retrieved")
     * )
     */
    public function unreadCount()
    {
        $userId = (int) auth()->id();

        $count = ConversationMessage::whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->whereHas('conversation', function ($query) use ($userId) {
                $query->where('borrower_id', $userId)
                    ->orWhere('owner_id', $userId);
            })
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }
}
