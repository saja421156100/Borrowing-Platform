# Borrowly — Final Integrated Version

This version contains the complete integrated frontend + Laravel backend used in the project.

## Implemented user flow

- Register, login, logout and JWT authentication
- Profile view/edit (name, email, phone, location, bio)
- Browse real items/categories from the API
- Add, edit and manage owned items with image upload
- Favorites
- Borrow request creation with borrowing dates
- Owner approve/reject flow
- Borrower confirms item received
- Owner confirms item returned
- My Borrowings and received Borrow Requests
- Reviews and ratings after a completed borrowing
- Persistent notifications + unread badge
- Borrowing-linked private chat + unread message badge
- User issue reports
- Real home page stats/categories/items
- Admin dashboard, users, items/categories, borrowings and reports
- Admin report CSV export

Borrowing is free. There is no payment or `price_per_day` flow.

Forgot-password functionality is intentionally not implemented.

## Required setup

From `backend/`:

1. Make sure PHP 8.1+, Composer and MySQL are available.
2. Review `.env` and configure your database. If `.env` is missing, copy `.env.example` to `.env`.
3. If dependencies are missing, run `composer install`.
4. If `APP_KEY` is empty, run `php artisan key:generate`.
5. If `JWT_SECRET` is empty, run `php artisan jwt:secret`.
6. Run `php artisan migrate`.
7. Run `php artisan storage:link` so uploaded item images are public.
8. Start the API with `php artisan serve --host=127.0.0.1 --port=8000`.

From `frontend/`, serve the static files through a local web server (for example VS Code Live Server or `python -m http.server 5500`) and open the served `index.html`.

The frontend API base defaults to `http://127.0.0.1:8000/api` in `frontend/assets/js/app.js`.

## Creating the first admin

Register normally first. Then, from `backend/`, run `php artisan tinker` and execute:

```php
App\Models\User::where('email', 'YOUR_EMAIL@example.com')->update(['role' => 'admin']);
```

Exit Tinker, log out of Borrowly, and log in again. An **Admin** link will appear in the main navigation.

## Main end-to-end test

Use two normal accounts:

1. Account A adds an item.
2. Account B browses the item and sends a borrow request.
3. Account A opens Borrow Requests and approves it.
4. Either side can open Message from the borrowing/request and chat privately.
5. Account B confirms receiving the item.
6. Account A confirms the return.
7. Account B leaves a review.
8. Confirm notifications update during the lifecycle.

For admin testing, promote a third/selected account to admin using the steps above and open `frontend/admin/dashboard.html` through your frontend server.
