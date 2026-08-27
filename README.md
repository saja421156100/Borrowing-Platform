# Borrowing Platform

A web-based item sharing and borrowing platform that allows users to lend items they own and do not regularly use to other users who need them for a limited period of time.

## 🚀 Project Team
* **Sara Mema** (Backend & Documentation)
* **Saja Al-Najjar** (Frontend & Database)
* **Hadeel Al-Nakhala** (Borrowing Logic & Testing)
* **Supervised By:** ENG. Nesma Lubbad

---

## 📌 Problem Statement & Solution

### ❌ The Problem
Many people need certain items only for a short period (such as cameras, tools, books, camping equipment, or electronic devices). Purchasing these items can be expensive and unnecessary when needed temporarily. At the same time, many people own items that they rarely use and leave unused for long periods. Without a centralized platform, it is difficult to find, request, track, and build trust regarding borrowed items.

### ✅ The Solution
The **Borrowing Platform** solves this problem by connecting item owners with people who need items temporarily. The platform organizes the entire borrowing lifecycle—from searching and requesting an item, managing availability and dates, to returning it and reviewing the users involved.

---

## 📂 Repository Structure

```text
borrowing-platform/
│
├── app/
│   ├── Http/
│   │   ├── Controllers/        # API Controllers (Auth, Item, Request, Review, etc.)
│   │   ├── Middleware/         # Custom middleware (JWT Authentication, etc.)
│   │   └── Requests/           # Form Request validation classes
│   ├── Models/                 # Eloquent Models (User, Item, Category, BorrowingRequest, Borrowing, Review)
│   └── ...
│
├── database/
│   └── migrations/             # Database migration files for all tables
│
├── routes/
│   └── api.php                 # RESTful API routes configuration
│
├── tests/                      # Unit and Feature tests
│
├── .env.example                # Environment configuration template
├── composer.json               # PHP dependencies and project configuration
└── README.md                   # Project documentation

🛠️ Technologies UsedBackend:
PHP, Laravel (RESTful API Architecture)Database: MySQL, Eloquent ORMAuthentication: JWT (JSON Web Token) via tymon/jwt-authFrontend: HTML, CSS, JavaScript, Bootstrap / BladeAPI

Testing & Documentation:
Postman / Thunder Client, Swagger / OpenAPI⚙️ Installation & Setup (For Local Development)

To get a copy of the project up and running on your local machine, follow these steps:
1. Clone the RepositoryBashgit clone [https://github.com/YOUR_USERNAME/borrowing-platform.git](https://github.com/YOUR_USERNAME/borrowing-platform.git)
cd borrowing-platform
2. Install PHP DependenciesBashcomposer install
3. Environment ConfigurationCopy the example environment file and configure your database settings:Bashcp .env.example .env
Open the .env file and update your database credentials:مقتطف الرمزDB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=borrowing_platform
DB_USERNAME=root
DB_PASSWORD=
4. Generate Application Key & JWT SecretRun the following commands to generate the app key and JWT authentication secret:Bashphp artisan key:generate
php artisan jwt:secret
5. Run Database MigrationsRun the migrations to create the required tables (users, categories, items, borrowing_requests, borrowings, reviews):Bashphp artisan migrate
6. Run the ApplicationStart the local development server:Bashphp artisan serve
The API will be available at http://127.0.0.1:8000/api/v1/.📌 Main API Endpoints SummaryFeatureMethodEndpointAuth RequiredRegisterPOST/api/v1/auth/registerNoLoginPOST/api/v1/auth/loginNoGet ProfileGET/api/v1/auth/meYes (JWT)Get All ItemsGET/api/v1/itemsNoCreate ItemPOST/api/v1/itemsYes (JWT)Borrow RequestPOST/api/v1/requestsYes (JWT)SummaryFeatureMethodEndpointRegisterPOST/api/v1/auth/registerLoginPOST/api/v1/auth/loginGet ProfileGET/api/v1/auth/meGet All ItemsGET/api/v1/itemsCreate ItemPOST/api/v1/items (Auth)Borrow RequestPOST/api/v1/requests (Auth)# Borrowing-Platform
