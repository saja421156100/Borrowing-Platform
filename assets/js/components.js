function logo() {
    return `
        <div class="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-extrabold">
            B
        </div>
    `;
}

function avatar(name, size = "h-9 w-9") {
    const initials = name
        .split(" ")
        .map(word => word[0])
        .slice(0, 2)
        .join("");

    return `
        <div class="${size} shrink-0 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
            ${initials}
        </div>
    `;
}

function rating(value) {
    return `
        <div class="flex items-center gap-1">
            <span class="text-amber-400">★</span>
            <span class="text-xs font-semibold text-gray-700">${value}</span>
        </div>
    `;
}

function statusBadge(status) {
    const classes = {
        Available: "bg-emerald-50 text-emerald-600",
        Reserved: "bg-amber-50 text-amber-600",
        Unavailable: "bg-red-50 text-red-500",
        Pending: "bg-amber-50 text-amber-600",
        Approved: "bg-emerald-50 text-emerald-600",
        Completed: "bg-blue-50 text-blue-600",
        Rejected: "bg-red-50 text-red-500"
    };

    return `
        <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes[status] || "bg-gray-100 text-gray-500"}">
            ${status}
        </span>
    `;
}


/* ==========================================
   NAVBAR
========================================== */

function navbar() {
    return `
        <header class="fixed top-0 left-0 right-0 z-50
                       border-b border-gray-100
                       bg-white/95 backdrop-blur">
            <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

                <a href="index.html" class="flex items-center gap-2">
                    ${logo()}
                    <span class="font-bold text-gray-900">Borrowly</span>
                </a>

                <nav class="hidden items-center gap-7 md:flex">
                    <a href="index.html"
                       class="text-sm font-medium text-gray-600 hover:text-violet-600">
                        Home
                    </a>

                    <a href="browse.html"
                       class="text-sm font-medium text-gray-600 hover:text-violet-600">
                        Browse
                    </a>

                    <a href="my-items.html"
                       class="text-sm font-medium text-gray-600 hover:text-violet-600">
                        My Items
                    </a>

                    <a href="my-borrowings.html"
                       class="text-sm font-medium text-gray-600 hover:text-violet-600">
                        Borrowings
                    </a>
                </nav>

                <div class="flex items-center gap-2">

                    <a href="notifications.html"
                       class="relative rounded-xl p-2 text-gray-500 hover:bg-gray-50">
                        🔔
                        <span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-600"></span>
                    </a>

                    <a href="messages.html"
                       class="hidden rounded-xl p-2 text-gray-500 hover:bg-gray-50 sm:block">
                        💬
                    </a>

                    <a href="profile.html"
                       class="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-50">
                        ${avatar("Sara Ahmed")}
                        <span class="hidden text-sm font-semibold sm:block">
                            Sara
                        </span>
                    </a>

                </div>
            </div>
        </header>
    `;
}


/* ==========================================
   FOOTER
========================================== */

function footer() {
    return `
        <footer class="border-t border-gray-100 bg-white">
            <div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">

                <a href="index.html" class="flex items-center gap-2">
                    ${logo()}
                    <span class="font-bold">Borrowly</span>
                </a>

                <p class="text-xs text-gray-400">
                    © 2026 Borrowly. Share more. Borrow better.
                </p>

                <div class="flex gap-5 text-xs text-gray-400">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Help</a>
                </div>
            </div>
        </footer>
    `;
}


/* ==========================================
   ITEM CARD
========================================== */

function itemCard(item) {
    return `
        <article class="item-card overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

            <a href="item-details.html?id=${item.id}"
               class="relative block h-48 overflow-hidden bg-gray-100">

                <img
                    src="${item.image}"
                    alt="${item.name}"
                    class="item-card-image h-full w-full object-cover"
                />

                <div class="absolute left-3 top-3">
                    ${statusBadge(item.status)}
                </div>

                <button
                    class="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-500">
                    ♡
                </button>
            </a>

            <div class="p-4">

                <div class="flex items-start justify-between gap-3">

                    <div class="min-w-0">
                        <p class="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                            ${item.category}
                        </p>

                        <a href="item-details.html?id=${item.id}"
                           class="mt-1 block line-clamp-1 text-base font-bold text-gray-900">
                            ${item.name}
                        </a>
                    </div>

                    <p class="whitespace-nowrap text-base font-extrabold">
                        $${item.price}
                        <span class="text-xs font-medium text-gray-400">/day</span>
                    </p>

                </div>

                <div class="mt-3 flex items-center justify-between">
                    ${rating(item.rating)}
                    <span class="text-xs text-gray-400">
                        ${item.reviews} reviews
                    </span>
                </div>

                <div class="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                    ${avatar(item.owner)}

                    <div>
                        <p class="text-xs font-semibold">${item.owner}</p>
                        <p class="text-[11px] text-gray-400">${item.location}</p>
                    </div>
                </div>

            </div>
        </article>
    `;
}


/* ==========================================
   SEARCH BAR
========================================== */

function searchBar() {
    return `
        <div class="flex h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
            🔍
            <input
                id="searchInput"
                type="text"
                placeholder="Search cameras, tools, tents..."
                class="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
        </div>
    `;
}


/* ==========================================
   CATEGORY CARD
========================================== */

function categoryCard(category) {
    return `
        <a
            href="browse.html?category=${encodeURIComponent(category.name)}"
            class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
        >

            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-2xl">
                ${category.icon}
            </div>

            <h3 class="mt-4 font-bold">
                ${category.name}
            </h3>

            <p class="mt-1 text-xs text-gray-400">
                ${category.count} items
            </p>

            <p class="mt-4 text-xs font-bold text-violet-600">
                Explore →
            </p>

        </a>
    `;
}


/* ==========================================
   ADMIN SIDEBAR
========================================== */

function adminSidebar() {
    return `
        <aside class="admin-sidebar hidden min-h-screen w-64 shrink-0 text-white lg:block">

            <div class="flex h-16 items-center gap-2 border-b border-white/10 px-5">
                ${logo()}
                <span class="font-bold">Borrowly</span>
            </div>

            <div class="px-4 pt-7">

                <p class="mb-3 px-3 text-[9px] font-semibold uppercase tracking-widest text-white/40">
                    Admin Panel
                </p>

                <nav class="space-y-1">

                    <a href="dashboard.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        🏠 Dashboard
                    </a>

                    <a href="users.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        👥 Users
                    </a>

                    <a href="items.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        📦 Items
                    </a>

                    <a href="borrowings.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        🔄 Borrowings
                    </a>

                    <a href="reports.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        📊 Reports
                    </a>

                    <a href="../messages.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        💬 Messages
                    </a>

                    <a href="../notifications.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        🔔 Notifications
                    </a>

                    <a href="../profile.html"
                       class="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                        ⚙️ Settings
                    </a>

                </nav>
            </div>

            <div class="mt-10 border-t border-white/10 p-4">
                <div class="flex items-center gap-3">
                    ${avatar("Admin User")}
                    <div>
                        <p class="text-xs font-semibold">admin@borrowly.com</p>
                        <p class="text-[10px] text-white/40">
                            Administrator
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    `;
}


/* ==========================================
   ADMIN HEADER
========================================== */

function adminHeader(title) {
    return `
        <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6">

            <h1 class="font-bold">
                ${title}
            </h1>

            <div class="flex items-center gap-3">

                <div class="hidden rounded-xl border border-gray-200 px-3 py-2 text-[11px] text-gray-500 sm:block">
                    May 20, 2024 — June 20, 2024
                </div>

                ${avatar("Admin User")}

            </div>
        </header>
    `;
}


/* ==========================================
   ADMIN TABLE
========================================== */

function adminTable(headers, rows) {
    return `
        <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

            <div class="overflow-x-auto">
                <table class="w-full min-w-[700px] text-left">

                    <thead class="bg-gray-50">
                        <tr>
                            ${headers.map(header => `
                                <th class="px-5 py-4 text-[10px] uppercase tracking-wide text-gray-400">
                                    ${header}
                                </th>
                            `).join("")}
                        </tr>
                    </thead>

                    <tbody>
                        ${rows.map(row => `
                            <tr class="border-t border-gray-100 hover:bg-gray-50">
                                ${row.map(cell => `
                                    <td class="px-5 py-4 text-xs">
                                        ${cell}
                                    </td>
                                `).join("")}
                            </tr>
                        `).join("")}
                    </tbody>

                </table>
            </div>

        </div>
    `;
}