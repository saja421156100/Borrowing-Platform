<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\BorrowingController;
use App\Http\Controllers\ReviewController;


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


/*
|--------------------------------------------------------------------------
| Categories
|--------------------------------------------------------------------------
*/

Route::apiResource('categories', CategoryController::class);


/*
|--------------------------------------------------------------------------
| Items
|--------------------------------------------------------------------------
*/

Route::apiResource('items', ItemController::class);


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


    /*
    |--------------------------------------------------------------------------
    | Borrowings - User
    |--------------------------------------------------------------------------
    */

    Route::post('/borrowings', [BorrowingController::class, 'store']);
    Route::get('/my-borrowings', [BorrowingController::class, 'myBorrowings']);
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


    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */

    Route::middleware('admin')->group(function () {

        Route::get('/borrowings', [BorrowingController::class, 'index']);
        Route::put('/borrowings/{id}', [BorrowingController::class, 'update']);
        Route::delete('/borrowings/{id}', [BorrowingController::class, 'destroy']);

    });

});