# Borrowly

**Borrowly** is a full-stack web platform that allows users to share and borrow useful items from each other for free.

The main goal of the platform is to encourage community sharing, reduce unnecessary purchases, and make better use of items that are not used all the time.

---

## Features

- User Registration and Login
- JWT Authentication
- User Profile Management
- Add, Edit, and Delete Items
- Upload Item Images
- Browse and Search Items
- Filter Items by Category and Status
- Favorites
- Borrowing Requests
- Approve and Reject Requests
- Confirm Item Receiving
- Confirm Item Return
- Reviews and Ratings
- Notifications
- Messages and Chat
- Reports
- Admin Dashboard

---

## Borrowing Process

**Pending**  
↓  
**Approved / Rejected**  
↓  
**Confirm Received**  
↓  
**Borrowed**  
↓  
**Confirm Return**  
↓  
**Returned**  
↓  
**Review & Rating**

---

## Technologies Used

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- PHP
- Laravel
- REST API

### Database

- MySQL

### Authentication

- JWT Authentication

---

## Admin Dashboard

The Admin Dashboard allows administrators to:

- View platform statistics
- Manage users
- Manage items
- Manage categories
- Monitor borrowings
- View reports
- Monitor reviews

---

## Installation

### 1. Clone the repository

`git clone https://github.com/saja421156100/Borrowing-Platform.git`

### 2. Open the backend folder

`cd Borrowing-Platform/backend`

### 3. Install dependencies

`composer install`

### 4. Create the environment file

Copy `.env.example` and rename the copy to `.env`.

Configure the MySQL database inside the `.env` file.

### 5. Generate the application key

`php artisan key:generate`

### 6. Generate the JWT secret

`php artisan jwt:secret`

### 7. Run migrations

`php artisan migrate`

### 8. Create the storage link

`php artisan storage:link`

### 9. Run the backend

`php artisan serve --host=127.0.0.1 --port=8000`

### 10. Run the frontend

Open another terminal and go to the frontend folder:

`cd frontend`

Then run:

`php -S 127.0.0.1:5500`

Open the application at:

`http://127.0.0.1:5500`

---

## Admin Account

First, register a normal user account.

Then run:

`php artisan tinker`

Inside Tinker, use:

`App\Models\User::where('email', 'your-email@example.com')->update(['role' => 'admin']);`

Log out and log in again.

The **Admin** option will appear in the navigation bar.

---

## Important Note

Borrowly is a **free borrowing platform**.

There are no payments or rental fees in the current version.

---

## Future Improvements

- Mobile Application
- Real-Time Chat
- Maps and Location Services
- Email and Push Notifications
- User Verification
- Advanced Recommendations
- Cloud Deployment

---

## Repository

**GitHub:** https://github.com/saja421156100/Borrowing-Platform
