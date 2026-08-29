# Borrowly

Borrowly is a full-stack web platform that allows users to share and borrow useful items from each other for free.

The platform helps users find items they need temporarily instead of buying them, while encouraging community sharing and reducing waste.

## Main Features

- User registration and login
- JWT authentication
- User profile management
- Add, edit, and delete items
- Upload item images
- Browse and search items
- Filter items by category and status
- Favorites
- Borrowing requests
- Approve and reject requests
- Confirm item receiving and returning
- Reviews and ratings
- Notifications
- Messages between borrowers and owners
- Reports
- Admin Dashboard
- User, item, category, borrowing, and report management

## Borrowing Process

The borrowing lifecycle is:

```text
Pending
   ↓
Approved / Rejected
   ↓
Confirm Received
   ↓
Borrowed
   ↓
Confirm Return
   ↓
Returned

   ↓





Technologies Used
Frontend
HTML
CSS
JavaScript
Backend
PHP
Laravel
REST API
Database
MySQL
Authentication
JWT Authentication
Project Structure
Borrowing-Platform/
│
├── backend/
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── storage/
│   └── composer.json
│
├── frontend/
│   ├── admin/
│   ├── assets/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── browse.html
│   ├── item-details.html
│   ├── my-items.html
│   ├── my-borrowings.html
│   ├── favorites.html
│   ├── notifications.html
│   ├── messages.html
│   └── profile.html
│
└── README.md
Installation
1. Clone the repository
git clone https://github.com/saja421156100/Borrowing-Platform.git
2. Open the backend
cd Borrowing-Platform/backend
3. Install dependencies
composer install
4. Create the environment file

Copy:

.env.example

and rename it to:

.env

Configure your MySQL database inside .env.

Example:

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=borrowly
DB_USERNAME=root
DB_PASSWORD=

APP_URL=http://127.0.0.1:8000
5. Generate application keys
php artisan key:generate
php artisan jwt:secret
6. Run migrations
php artisan migrate
7. Create the storage link
php artisan storage:link
8. Run the backend
php artisan serve --host=127.0.0.1 --port=8000
9. Run the frontend

Open another terminal:

cd frontend
php -S 127.0.0.1:5500

Then open:

http://127.0.0.1:5500
Admin Account

Register a normal account first.

Then run:

php artisan tinker

Inside Tinker:

App\Models\User::where('email', 'your-email@example.com')
    ->update(['role' => 'admin']);

Log out and log in again to access the Admin Dashboard.

Important Note

Borrowly is a free borrowing platform.

There are no payments or rental fees in the current version.

Future Improvements

Possible future improvements include:

Mobile application
Real-time chat
Maps and location services
Email and push notifications
User verification
Advanced recommendations
Cloud deploymentReview & Rating
