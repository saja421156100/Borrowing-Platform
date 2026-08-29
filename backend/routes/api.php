<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\BorrowingController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AdminController;


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/home', [HomeController::class, 'index']);


/*
|--------------------------------------------------------------------------
| Categories
|--------------------------------------------------------------------------
*/

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);


/*
|--------------------------------------------------------------------------
| Items
|--------------------------------------------------------------------------
*/

Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/{item}', [ItemController::class, 'show']);


/*
|--------------------------------------------------------------------------
| Public Reviews
|--------------------------------------------------------------------------
*/

// Get all reviews
Route::get('/reviews', [ReviewController::class, 'index']);

// Get reviews for a specific item
Route::get('/items/{itemId}/reviews', [ReviewController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Protected Routes - JWT
|--------------------------------------------------------------------------
*/

Route::middleware('auth:api')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);


    /*
    |--------------------------------------------------------------------------
    | Items - Authenticated User
    |--------------------------------------------------------------------------
    */

    Route::get('/my-items', [ItemController::class, 'myItems']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::put('/items/{item}', [ItemController::class, 'update']);
    Route::patch('/items/{item}', [ItemController::class, 'update']);
    Route::delete('/items/{item}', [ItemController::class, 'destroy']);


    /*
    |--------------------------------------------------------------------------
    | Favorites
    |--------------------------------------------------------------------------
    */

    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::get('/favorites/ids', [FavoriteController::class, 'ids']);
    Route::post('/items/{item}/favorite', [FavoriteController::class, 'store']);
    Route::delete('/items/{item}/favorite', [FavoriteController::class, 'destroy']);


    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);


    /*
    |--------------------------------------------------------------------------
    | Messages / Chat
    |--------------------------------------------------------------------------
    */

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/borrowings/{id}/conversation', [ConversationController::class, 'openFromBorrowing']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'send']);
    Route::get('/messages/unread-count', [ConversationController::class, 'unreadCount']);


    /*
    |--------------------------------------------------------------------------
    | Borrowings - User
    |--------------------------------------------------------------------------
    */

    Route::post('/borrowings', [BorrowingController::class, 'store']);
    Route::get('/my-borrowings', [BorrowingController::class, 'myBorrowings']);
    Route::get('/received-borrow-requests', [BorrowingController::class, 'receivedRequests']);
    Route::patch('/borrowings/{id}/approve', [BorrowingController::class, 'approve']);
    Route::patch('/borrowings/{id}/reject', [BorrowingController::class, 'reject']);
    Route::patch('/borrowings/{id}/confirm-received', [BorrowingController::class, 'confirmReceived']);
    Route::patch('/borrowings/{id}/confirm-returned', [BorrowingController::class, 'confirmReturned']);
    Route::get('/borrowings/{id}', [BorrowingController::class, 'show']);


    /*
    |--------------------------------------------------------------------------
    | Reviews
    |--------------------------------------------------------------------------
    */

    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::get('/reviews/{id}', [ReviewController::class, 'show']);
    Route::put('/reviews/{id}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    Route::post('/reports', [ReportController::class, 'store']);


    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */

    Route::middleware('admin')->group(function () {

        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::patch('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::get('/borrowings', [BorrowingController::class, 'index']);
        Route::put('/borrowings/{id}', [BorrowingController::class, 'update']);
        Route::delete('/borrowings/{id}', [BorrowingController::class, 'destroy']);

        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::patch('/admin/users/{user}/role', [AdminController::class, 'updateUserRole']);
        Route::delete('/admin/users/{user}', [AdminController::class, 'destroyUser']);
        Route::get('/admin/items', [AdminController::class, 'items']);
        Route::delete('/admin/items/{item}', [AdminController::class, 'destroyItem']);
        Route::get('/admin/reports', [AdminController::class, 'reports']);
        Route::patch('/admin/reports/{report}', [AdminController::class, 'updateReport']);
        Route::get('/admin/reports-export', [AdminController::class, 'exportReports']);

    });

});