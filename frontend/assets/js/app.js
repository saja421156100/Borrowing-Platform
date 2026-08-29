const BORROWLY_API_BASE = window.BORROWLY_API_BASE || "http://127.0.0.1:8000/api";

/* ==========================================
   API + AUTH HELPERS
========================================== */

function getAuthToken() {
    return (
        localStorage.getItem("borrowly_token") ||
        sessionStorage.getItem("borrowly_token")
    );
}

function setAuthToken(token, remember = false) {
    localStorage.removeItem("borrowly_token");
    sessionStorage.removeItem("borrowly_token");

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("borrowly_token", token);
}

function clearAuthToken() {
    localStorage.removeItem("borrowly_token");
    sessionStorage.removeItem("borrowly_token");
    localStorage.removeItem("borrowly_user");
    sessionStorage.removeItem("borrowly_user");
}

async function logoutBorrowly() {
    const isAdminPage = window.location.pathname.replaceAll("\\", "/").includes("/admin/");

    try {
        if (getAuthToken()) {
            await apiRequest("/logout", {
                method: "POST",
                auth: true
            });
        }
    } catch (_) {
        // Even if the backend is unavailable or the token has expired,
        // clear the local session so the user can still log out safely.
    } finally {
        clearAuthToken();
        window.location.href = isAdminPage ? "../login.html" : "login.html";
    }
}

function currentPageWithQuery() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return `${page}${window.location.search || ""}`;
}

function redirectToLogin() {
    const next = encodeURIComponent(currentPageWithQuery());
    window.location.href = `login.html?next=${next}`;
}

async function apiRequest(path, options = {}) {
    const { auth = false, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});

    headers.set("Accept", "application/json");

    if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (auth) {
        const token = getAuthToken();

        if (!token) {
            const error = new Error("Please log in to continue.");
            error.status = 401;
            throw error;
        }

        headers.set("Authorization", `Bearer ${token}`);
    }

    let response;

    try {
        response = await fetch(`${BORROWLY_API_BASE}${path}`, {
            ...fetchOptions,
            headers
        });
    } catch (networkError) {
        const error = new Error(
            "Cannot reach the Borrowly backend. Make sure Laravel is running on http://127.0.0.1:8000."
        );
        error.status = 0;
        error.cause = networkError;
        throw error;
    }

    let payload = null;

    try {
        payload = await response.json();
    } catch (_) {
        payload = null;
    }

    if (!response.ok) {
        const validationMessage = payload?.errors
            ? Object.values(payload.errors).flat().join(" ")
            : null;

        const error = new Error(
            validationMessage || payload?.message || "Something went wrong."
        );
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function displayStatus(status = "") {
    return String(status)
        .split("_")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function formatBorrowingDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}

/* ==========================================
   LOGIN
========================================== */

function setupLogin() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const rememberInput = document.getElementById("rememberMe");
    const submitButton = document.getElementById("loginSubmit");
    const errorBox = document.getElementById("loginError");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        errorBox.classList.add("hidden");
        errorBox.textContent = "";
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        try {
            const result = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            setAuthToken(result.token, rememberInput.checked);

            // Cache the signed-in user when possible so other pages can reuse it later.
            try {
                const me = await apiRequest("/me", { auth: true });
                const storage = rememberInput.checked ? localStorage : sessionStorage;
                storage.setItem("borrowly_user", JSON.stringify(me.user));
            } catch (_) {
                // A successful login should not be blocked by optional profile caching.
            }

            const params = new URLSearchParams(window.location.search);
            const next = params.get("next");
            const safeNext =
                next && !next.includes("://") && !next.startsWith("//")
                    ? next
                    : "index.html";

            window.location.href = safeNext;
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Log in";
        }
    });
}

/* ==========================================
   HOME
========================================== */

function homeCategoryIcon(name = "") {
    const key = String(name).toLowerCase();
    if (key.includes("elect")) return "📱";
    if (key.includes("tool")) return "🛠️";
    if (key.includes("camp") || key.includes("outdoor")) return "⛺";
    if (key.includes("sport")) return "⚽";
    if (key.includes("book")) return "📚";
    if (key.includes("camera") || key.includes("photo")) return "📷";
    if (key.includes("kitchen") || key.includes("home")) return "🏠";
    if (key.includes("game")) return "🎮";
    return "📦";
}

function compactHomeNumber(value) {
    const number = Math.max(0, Number(value) || 0);
    if (number >= 1000) {
        return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1, notation: "compact" }).format(number)}+`;
    }
    return number.toLocaleString();
}

function homeHeroCard(item) {
    const image = item.image || "https://placehold.co/900x600?text=Borrowly+Item";
    const name = item.name || "Borrowly item";
    return `
        <a href="item-details.html?id=${encodeURIComponent(item.id)}"
           class="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <img src="${escapeHtml(image)}"
                 alt="${escapeHtml(name)}"
                 class="h-36 w-full object-cover"
                 onerror="this.src='https://placehold.co/900x600?text=Borrowly+Item'">
            <div class="p-3">
                <p class="truncate text-xs font-bold">${escapeHtml(name)}</p>
                <p class="mt-1 text-[11px] font-semibold text-violet-600">Free to borrow</p>
            </div>
        </a>
    `;
}

async function setupHome() {
    const categoriesElement = document.getElementById("categories");
    const popularItems = document.getElementById("popularItems");
    const heroItems = document.getElementById("homeHeroItems");
    if (!categoriesElement || !popularItems || !heroItems) return;

    const sharingLinks = [
        document.getElementById("homeStartSharing"),
        document.getElementById("homeListItem")
    ].filter(Boolean);

    if (getAuthToken()) {
        sharingLinks.forEach(link => {
            link.href = "add-item.html";
        });
    }

    try {
        const result = await apiRequest("/home");
        const data = result.data || {};
        const stats = data.stats || {};
        const categories = Array.isArray(data.categories) ? data.categories : [];
        const items = Array.isArray(data.items) ? data.items : [];

        const members = document.getElementById("homeMembersCount");
        const itemsCount = document.getElementById("homeItemsCount");
        const ratingElement = document.getElementById("homeRating");

        if (members) members.textContent = compactHomeNumber(stats.members);
        if (itemsCount) itemsCount.textContent = compactHomeNumber(stats.items);
        if (ratingElement) {
            ratingElement.textContent = stats.rating !== null && stats.rating !== undefined
                ? `${Number(stats.rating).toFixed(1)}/5`
                : "New";
        }

        categoriesElement.innerHTML = categories.length
            ? categories.map(category => categoryCard({
                ...category,
                icon: homeCategoryIcon(category.name)
            })).join("")
            : `<div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">No categories have been added yet.</div>`;

        popularItems.innerHTML = items.length
            ? items.map(item => itemCard(item, { favorites: Boolean(getAuthToken()) })).join("")
            : `<div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">No available items yet.</div>`;

        heroItems.innerHTML = items.length
            ? items.map(homeHeroCard).join("")
            : `<div class="col-span-2 py-16 text-center text-sm font-semibold text-gray-400">No items available yet.</div>`;

        if (getAuthToken()) {
            await loadFavoriteIds();
            popularItems.innerHTML = items.length
                ? items.map(item => itemCard(itemWithFavoriteState(item), { favorites: true })).join("")
                : popularItems.innerHTML;
        }
    } catch (error) {
        const message = escapeHtml(error.message);
        categoriesElement.innerHTML = `<div class="col-span-full rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-600">${message}</div>`;
        popularItems.innerHTML = `<div class="col-span-full rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-600">${message}</div>`;
        heroItems.innerHTML = `<div class="col-span-2 p-8 text-center text-sm font-semibold text-red-500">Could not load items.</div>`;
    }
}

/* ==========================================
   ITEM DETAILS + BORROW REQUEST
========================================== */

function getItemIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    return Number.isInteger(id) && id > 0 ? id : null;
}

function getCachedUser() {
    const raw =
        localStorage.getItem("borrowly_user") ||
        sessionStorage.getItem("borrowly_user");

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

const borrowlyFavoriteIds = new Set();

async function loadFavoriteIds() {
    borrowlyFavoriteIds.clear();

    if (!getAuthToken()) {
        return borrowlyFavoriteIds;
    }

    try {
        const result = await apiRequest("/favorites/ids", { auth: true });
        const ids = Array.isArray(result.data) ? result.data : [];

        ids.forEach(id => {
            const numericId = Number(id);
            if (Number.isInteger(numericId) && numericId > 0) {
                borrowlyFavoriteIds.add(numericId);
            }
        });
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
        }
    }

    return borrowlyFavoriteIds;
}

function itemWithFavoriteState(item) {
    return {
        ...item,
        is_favorited: borrowlyFavoriteIds.has(Number(item.id))
    };
}

function updateFavoriteButtons(itemId, isFavorited) {
    document.querySelectorAll(`[data-favorite-button][data-item-id="${itemId}"]`).forEach(button => {
        button.dataset.favorited = isFavorited ? "true" : "false";
        button.setAttribute("aria-pressed", isFavorited ? "true" : "false");
        button.setAttribute("aria-label", isFavorited ? "Remove from favorites" : "Add to favorites");
        button.textContent = isFavorited ? "♥" : "♡";
        button.classList.toggle("text-rose-500", isFavorited);
        button.classList.toggle("text-gray-500", !isFavorited);
    });
}

document.addEventListener("click", async event => {
    const button = event.target.closest("[data-favorite-button]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const itemId = Number(button.dataset.itemId);
    if (!Number.isInteger(itemId) || itemId <= 0 || button.disabled) return;

    const isFavorited = button.dataset.favorited === "true";
    button.disabled = true;

    try {
        await apiRequest(`/items/${itemId}/favorite`, {
            method: isFavorited ? "DELETE" : "POST",
            auth: true
        });

        if (isFavorited) {
            borrowlyFavoriteIds.delete(itemId);
        } else {
            borrowlyFavoriteIds.add(itemId);
        }

        updateFavoriteButtons(itemId, !isFavorited);
        document.dispatchEvent(new CustomEvent("borrowly:favorites-changed", {
            detail: { itemId, isFavorited: !isFavorited }
        }));
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        openModal("Could not update favorites", error.message);
    } finally {
        button.disabled = false;
    }
});

document.addEventListener("click", event => {
    const reportButton = event.target.closest("[data-report-item-id]");
    if (!reportButton) return;

    const itemId = Number(reportButton.dataset.reportItemId);
    if (!Number.isInteger(itemId) || itemId <= 0) return;

    openReportModal({ itemId, context: "item" });
});

function todayInputValue() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function itemRatingSummary(item) {
    const reviews = Array.isArray(item.reviews) ? item.reviews : [];
    const apiCount = Number(item.reviews_count);
    const apiAverage = Number(item.reviews_avg_rating);

    if (Number.isFinite(apiCount) && apiCount > 0 && Number.isFinite(apiAverage)) {
        return {
            rating: apiAverage.toFixed(1),
            count: apiCount
        };
    }

    if (!reviews.length) {
        return { rating: "New", count: 0 };
    }

    const values = reviews
        .map(review => Number(review.rating))
        .filter(value => Number.isFinite(value));

    if (!values.length) {
        return { rating: "New", count: reviews.length };
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
        rating: average.toFixed(1),
        count: reviews.length
    };
}

function reviewStarsMarkup(value) {
    const ratingValue = Math.max(0, Math.min(5, Number(value) || 0));

    return Array.from({ length: 5 }, (_, index) => `
        <span class="${index < ratingValue ? "text-amber-400" : "text-gray-200"}">★</span>
    `).join("");
}

function formatReviewDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function renderItemReviews(item) {
    const reviews = Array.isArray(item.reviews) ? item.reviews : [];
    const summary = itemRatingSummary(item);

    if (!reviews.length) {
        return `
            <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <h2 class="font-bold">Reviews</h2>
                        <p class="mt-1 text-sm text-gray-400">No reviews yet.</p>
                    </div>
                    <div class="rounded-xl bg-gray-50 px-4 py-3 text-center">
                        <div class="text-lg font-extrabold text-gray-700">New</div>
                        <div class="text-[11px] text-gray-400">0 reviews</div>
                    </div>
                </div>
            </div>
        `;
    }

    const cards = reviews.map(review => {
        const reviewerName = escapeHtml(review.user?.name || "Borrowly member");
        const comment = review.comment
            ? `<p class="mt-3 text-sm leading-6 text-gray-500">${escapeHtml(review.comment)}</p>`
            : `<p class="mt-3 text-sm italic text-gray-400">No written comment.</p>`;
        const dateText = formatReviewDate(review.created_at);

        return `
            <div class="rounded-2xl border border-gray-100 p-5">
                <div class="flex items-start gap-3">
                    ${avatar(reviewerName)}
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p class="text-sm font-bold text-gray-900">${reviewerName}</p>
                                ${dateText ? `<p class="mt-0.5 text-[11px] text-gray-400">${escapeHtml(dateText)}</p>` : ""}
                            </div>
                            <div class="flex items-center gap-0.5 text-base" aria-label="${Number(review.rating) || 0} out of 5 stars">
                                ${reviewStarsMarkup(review.rating)}
                            </div>
                        </div>
                        ${comment}
                    </div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="font-bold">Reviews</h2>
                    <p class="mt-1 text-sm text-gray-400">Feedback from members who borrowed and returned this item.</p>
                </div>
                <div class="rounded-xl bg-violet-50 px-4 py-3 text-center">
                    <div class="text-xl font-extrabold text-violet-700">${escapeHtml(summary.rating)}</div>
                    <div class="text-[11px] font-semibold text-violet-500">${summary.count} ${summary.count === 1 ? "review" : "reviews"}</div>
                </div>
            </div>

            <div class="mt-5 space-y-3">
                ${cards}
            </div>
        </div>
    `;
}

function renderItemDetails(item) {
    const container = document.getElementById("itemDetails");

    if (!container) return;

    const name = escapeHtml(item.name || "Item");
    const description = escapeHtml(item.description || "No description provided.");
    const category = escapeHtml(item.category?.name || "Uncategorized");
    const location = escapeHtml(item.location || "Not specified");
    const condition = displayStatus(item.condition || "Not specified");
    const ownerName = escapeHtml(item.owner?.name || "Borrowly member");
    const image = item.image
        ? escapeHtml(item.image)
        : "https://placehold.co/1200x800?text=Borrowly+Item";
    const status = displayStatus(item.status || "unavailable");
    const available = String(item.status || "").toLowerCase() === "available";
    const ratingSummary = itemRatingSummary(item);
    const cachedUser = getCachedUser();
    const ownItem = cachedUser && Number(cachedUser.id) === Number(item.user_id);
    const requestDisabled = !available || ownItem;

    const requestLabel = ownItem
        ? "This is your item"
        : available
            ? "Request to borrow"
            : "Currently unavailable";

    container.innerHTML = `
        <div class="grid gap-8 lg:grid-cols-[1.35fr_.75fr]">
            <div>
                <div class="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <img src="${image}" alt="${name}" class="h-[340px] w-full object-cover sm:h-[500px]">
                </div>

                <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <p class="text-xs font-bold uppercase tracking-widest text-violet-600">${category}</p>
                            <h1 class="mt-2 text-3xl font-extrabold">${name}</h1>

                            <div class="mt-3 flex gap-3">
                                ${rating(ratingSummary.rating)}
                                <span class="text-sm text-gray-400">${ratingSummary.count} reviews</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            data-favorite-button
                            data-item-id="${item.id}"
                            data-favorited="${item.is_favorited ? "true" : "false"}"
                            aria-pressed="${item.is_favorited ? "true" : "false"}"
                            aria-label="${item.is_favorited ? "Remove from favorites" : "Add to favorites"}"
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-2xl shadow-sm transition hover:scale-105 ${item.is_favorited ? "text-rose-500" : "text-gray-500"}">
                            ${item.is_favorited ? "♥" : "♡"}
                        </button>
                    </div>

                    <div class="my-6 h-px bg-gray-100"></div>

                    <h2 class="font-bold">About this item</h2>
                    <p class="mt-3 text-sm leading-7 text-gray-500">${description}</p>

                    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div class="rounded-xl bg-gray-50 p-4">
                            <p class="text-[10px] text-gray-400">Category</p>
                            <p class="mt-1 text-sm font-semibold">${category}</p>
                        </div>

                        <div class="rounded-xl bg-gray-50 p-4">
                            <p class="text-[10px] text-gray-400">Location</p>
                            <p class="mt-1 text-sm font-semibold">${location}</p>
                        </div>

                        <div class="rounded-xl bg-gray-50 p-4">
                            <p class="text-[10px] text-gray-400">Condition</p>
                            <p class="mt-1 text-sm font-semibold">${escapeHtml(condition)}</p>
                        </div>
                    </div>
                </div>

                ${renderItemReviews(item)}
            </div>

            <aside>
                <div class="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-xs text-gray-400">Borrowing</p>
                            <p class="mt-1 text-2xl font-extrabold text-violet-600">Free to borrow</p>
                        </div>
                        ${statusBadge(status)}
                    </div>

                    <form id="borrowRequestForm" class="mt-6">
                        <label class="text-xs font-semibold">Borrowing dates</label>

                        <div class="mt-2 grid grid-cols-2 gap-2">
                            <div>
                                <span class="mb-1 block text-[10px] text-gray-400">From</span>
                                <input id="borrowStartDate" type="date" required
                                    class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-violet-500"
                                    ${requestDisabled ? "disabled" : ""}>
                            </div>
                            <div>
                                <span class="mb-1 block text-[10px] text-gray-400">To</span>
                                <input id="borrowEndDate" type="date" required
                                    class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-violet-500"
                                    ${requestDisabled ? "disabled" : ""}>
                            </div>
                        </div>

                        <div id="borrowRequestError" class="hidden mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600" role="alert"></div>

                        <div class="mt-5 rounded-xl bg-violet-50 p-4">
                            <p class="text-sm font-semibold text-violet-700">Borrowing is free</p>
                            <p class="mt-1 text-xs leading-5 text-gray-500">
                                Choose the borrowing dates and send a request. The item owner can approve or reject it.
                            </p>
                        </div>

                        <button id="borrowRequestSubmit" type="submit" ${requestDisabled ? "disabled" : ""}
                            class="mt-5 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                            ${requestLabel}
                        </button>
                    </form>

                    <div class="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
                        ${avatar(ownerName)}
                        <div>
                            <p class="text-sm font-bold">${ownerName}</p>
                            <p class="text-xs text-gray-400">Item owner</p>
                        </div>
                        ${!ownItem ? `
                            <button type="button" data-report-item-id="${Number(item.id)}" class="ml-auto rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50">Report listing</button>
                        ` : ""}
                    </div>
                </div>
            </aside>
        </div>
    `;

    if (!requestDisabled) {
        setupBorrowRequestForm(item);
    }
}

function setupBorrowRequestForm(item) {
    const form = document.getElementById("borrowRequestForm");
    const startInput = document.getElementById("borrowStartDate");
    const endInput = document.getElementById("borrowEndDate");
    const submitButton = document.getElementById("borrowRequestSubmit");
    const errorBox = document.getElementById("borrowRequestError");

    if (!form || !startInput || !endInput || !submitButton || !errorBox) return;

    const today = todayInputValue();
    startInput.min = today;
    endInput.min = today;

    startInput.addEventListener("change", () => {
        endInput.min = startInput.value || today;

        if (endInput.value && startInput.value && endInput.value < startInput.value) {
            endInput.value = startInput.value;
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        errorBox.classList.add("hidden");
        errorBox.textContent = "";

        if (!getAuthToken()) {
            redirectToLogin();
            return;
        }

        const borrowedAt = startInput.value;
        const dueDate = endInput.value;

        if (!borrowedAt || !dueDate) {
            errorBox.textContent = "Please choose both borrowing dates.";
            errorBox.classList.remove("hidden");
            return;
        }

        if (borrowedAt < today) {
            errorBox.textContent = "The borrowing start date cannot be in the past.";
            errorBox.classList.remove("hidden");
            return;
        }

        if (dueDate < borrowedAt) {
            errorBox.textContent = "The return date must be on or after the start date.";
            errorBox.classList.remove("hidden");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Sending request...";

        try {
            await apiRequest("/borrowings", {
                method: "POST",
                auth: true,
                body: JSON.stringify({
                    item_id: item.id,
                    borrowed_at: borrowedAt,
                    due_date: dueDate
                })
            });

            startInput.disabled = true;
            endInput.disabled = true;
            submitButton.textContent = "Request sent";

            openModal(
                "Borrow request sent",
                `Your request for ${item.name || "this item"} was sent to ${item.owner?.name || "the owner"}.`
            );
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
            submitButton.disabled = false;
            submitButton.textContent = "Request to borrow";
        }
    });
}

async function setupItemDetails() {
    const container = document.getElementById("itemDetails");
    const loading = document.getElementById("itemDetailsLoading");
    const errorBox = document.getElementById("itemDetailsError");
    const itemId = getItemIdFromURL();

    if (!container || !loading || !errorBox) return;

    if (!itemId) {
        loading.classList.add("hidden");
        errorBox.textContent = "No valid item was selected.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        const [result] = await Promise.all([
            apiRequest(`/items/${itemId}`),
            loadFavoriteIds()
        ]);
        renderItemDetails(itemWithFavoriteState(result.data));
    } catch (error) {
        errorBox.textContent = error.status === 404
            ? "This item could not be found."
            : error.message;
        errorBox.classList.remove("hidden");
    } finally {
        loading.classList.add("hidden");
    }
}


/* ==========================================
   BROWSE ITEMS - LIVE API
========================================== */

function browseEmptyState() {
    return `
        <div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <p class="font-bold text-gray-700">No items found</p>
            <p class="mt-2 text-sm text-gray-400">Try another search or filter.</p>
        </div>
    `;
}

function browseCategoryLink(category, activeCategoryId) {
    const active = String(activeCategoryId || "") === String(category.id);
    const count = Number(category.items_count || 0);

    return `
        <a href="browse.html?category_id=${encodeURIComponent(category.id)}"
           data-browse-category="${category.id}"
           class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${
               active
                   ? "bg-violet-50 font-semibold text-violet-600"
                   : "text-gray-500 hover:bg-gray-50"
           }">
            <span>${escapeHtml(category.name || "Category")}</span>
            <span class="text-[10px] text-gray-400">${count}</span>
        </a>
    `;
}

function updateBrowseUrl(state, categories = []) {
    const params = new URLSearchParams();

    if (state.search) params.set("search", state.search);
    if (state.categoryId) params.set("category_id", state.categoryId);
    if (state.status) params.set("status", state.status);
    if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
    if (state.page > 1) params.set("page", state.page);

    const query = params.toString();
    history.replaceState(null, "", `browse.html${query ? `?${query}` : ""}`);
}

async function setupBrowse() {
    const input = document.getElementById("searchInput");
    const grid = document.getElementById("itemsGrid");
    const categorySidebar = document.getElementById("browseCategorySidebar");
    const categoryFilter = document.getElementById("browseCategoryFilter");
    const statusFilter = document.getElementById("browseStatusFilter");
    const sortFilter = document.getElementById("browseSortFilter");
    const countLabel = document.getElementById("browseCount");
    const loading = document.getElementById("browseLoading");
    const errorBox = document.getElementById("browseError");
    const pagination = document.getElementById("browsePagination");
    const prevButton = document.getElementById("browsePrevPage");
    const nextButton = document.getElementById("browseNextPage");
    const pageLabel = document.getElementById("browsePageLabel");

    if (!input || !grid || !categorySidebar || !categoryFilter || !statusFilter || !sortFilter) return;

    const params = new URLSearchParams(window.location.search);
    const legacyCategoryName = params.get("category") || "";
    const state = {
        search: params.get("search") || "",
        categoryId: params.get("category_id") || "",
        status: params.get("status") || "",
        sort: params.get("sort") || "newest",
        page: Math.max(1, Number(params.get("page")) || 1),
        perPage: 9
    };

    let categories = [];
    let searchTimer = null;

    input.value = state.search;
    statusFilter.value = ["available", "unavailable", "borrowed"].includes(state.status)
        ? state.status
        : "";
    state.status = statusFilter.value;
    sortFilter.value = ["newest", "rating", "name", "oldest"].includes(state.sort)
        ? state.sort
        : "newest";
    state.sort = sortFilter.value;

    function renderCategories() {
        const allActive = !state.categoryId;
        categorySidebar.innerHTML = `
            <a href="browse.html"
               data-browse-category=""
               class="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                   allActive
                       ? "bg-violet-50 font-semibold text-violet-600"
                       : "text-gray-500 hover:bg-gray-50"
               }">
                <span>All categories</span>
            </a>
            ${categories.map(category => browseCategoryLink(category, state.categoryId)).join("")}
        `;

        categoryFilter.innerHTML = `
            <option value="">All Categories</option>
            ${categories.map(category => `
                <option value="${category.id}">${escapeHtml(category.name || "Category")}</option>
            `).join("")}
        `;
        categoryFilter.value = state.categoryId;
    }

    async function loadCategories() {
        try {
            const result = await apiRequest("/categories");
            categories = Array.isArray(result.data) ? result.data : [];

            if (!state.categoryId && legacyCategoryName) {
                const match = categories.find(
                    category => String(category.name || "").toLowerCase() === legacyCategoryName.toLowerCase()
                );

                if (match) state.categoryId = String(match.id);
            }

            if (state.categoryId && !categories.some(category => String(category.id) === String(state.categoryId))) {
                state.categoryId = "";
            }
        } catch (_) {
            categories = [];
        }

        renderCategories();
    }

    async function loadItems() {
        errorBox?.classList.add("hidden");
        pagination?.classList.add("hidden");
        grid.classList.add("hidden");
        loading?.classList.remove("hidden");

        const query = new URLSearchParams({
            per_page: state.perPage,
            page: state.page,
            sort: state.sort
        });

        if (state.search) query.set("search", state.search);
        if (state.categoryId) query.set("category_id", state.categoryId);
        if (state.status) query.set("status", state.status);

        try {
            const result = await apiRequest(`/items?${query.toString()}`);
            const items = Array.isArray(result.data) ? result.data : [];
            const page = result.pagination || {};
            const total = Number(page.total || 0);
            const currentPage = Number(page.current_page || 1);
            const lastPage = Math.max(1, Number(page.last_page || 1));

            state.page = currentPage;
            countLabel.innerHTML = `<strong class="text-gray-900">${total.toLocaleString()}</strong> ${total === 1 ? "item" : "items"} found`;
            grid.innerHTML = items.length
                ? items.map(item => itemCard(itemWithFavoriteState(item), { favorites: true })).join("")
                : browseEmptyState();
            grid.classList.remove("hidden");

            if (lastPage > 1) {
                pageLabel.textContent = `Page ${currentPage} of ${lastPage}`;
                prevButton.disabled = currentPage <= 1;
                nextButton.disabled = currentPage >= lastPage;
                pagination.classList.remove("hidden");
                pagination.classList.add("flex");
            } else {
                pagination.classList.remove("flex");
                pagination.classList.add("hidden");
            }

            updateBrowseUrl(state, categories);
        } catch (error) {
            countLabel.textContent = "Could not load items";
            grid.innerHTML = "";
            grid.classList.add("hidden");
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            loading?.classList.add("hidden");
        }
    }

    await Promise.all([loadCategories(), loadFavoriteIds()]);
    await loadItems();

    input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = input.value.trim();
            state.page = 1;
            loadItems();
        }, 300);
    });

    categoryFilter.addEventListener("change", () => {
        state.categoryId = categoryFilter.value;
        state.page = 1;
        renderCategories();
        loadItems();
    });

    categorySidebar.addEventListener("click", event => {
        const link = event.target.closest("[data-browse-category]");
        if (!link) return;

        event.preventDefault();
        state.categoryId = link.dataset.browseCategory || "";
        state.page = 1;
        renderCategories();
        loadItems();
    });

    statusFilter.addEventListener("change", () => {
        state.status = statusFilter.value;
        state.page = 1;
        loadItems();
    });

    sortFilter.addEventListener("change", () => {
        state.sort = sortFilter.value;
        state.page = 1;
        loadItems();
    });

    prevButton?.addEventListener("click", () => {
        if (state.page <= 1) return;
        state.page -= 1;
        loadItems();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    nextButton?.addEventListener("click", () => {
        state.page += 1;
        loadItems();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* ==========================================
   RECEIVED BORROW REQUESTS
========================================== */

function renderBorrowRequestCard(request) {
    const borrowerName = escapeHtml(request.user?.name || "Borrower");
    const borrowerEmail = escapeHtml(request.user?.email || "");
    const itemName = escapeHtml(request.item?.name || "Item");
    const itemImage = request.item?.image ? escapeHtml(request.item.image) : "";
    const status = displayStatus(request.status || "pending");
    const statusKey = String(request.status || "").toLowerCase();
    const isPending = statusKey === "pending";
    const isBorrowed = statusKey === "borrowed";

    const imageMarkup = itemImage
        ? `<img src="${itemImage}" alt="${itemName}" class="h-16 w-16 shrink-0 rounded-xl object-cover bg-gray-100">`
        : `<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">📦</div>`;

    const messageButton = Number.isInteger(Number(request.id)) && Number(request.id) > 0
        ? `<a href="messages.html?borrowing=${encodeURIComponent(request.id)}"
              class="inline-flex rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">
              Message
           </a>`
        : "";

    let actionsMarkup = "";

    if (isPending) {
        actionsMarkup = `
            <div class="flex gap-2" data-request-actions="${request.id}">
                <button
                    type="button"
                    data-borrow-action="approve"
                    data-request-id="${request.id}"
                    class="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                    Approve
                </button>

                <button
                    type="button"
                    data-borrow-action="reject"
                    data-request-id="${request.id}"
                    class="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                    Decline
                </button>
            </div>
        `;
    } else if (isBorrowed) {
        actionsMarkup = `
            <div class="flex gap-2" data-request-actions="${request.id}">
                <button
                    type="button"
                    data-borrow-action="confirm-returned"
                    data-request-id="${request.id}"
                    class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                    Confirm return
                </button>
            </div>
        `;
    }

    const statusHint = {
        approved: "Waiting for the borrower to confirm they received the item.",
        borrowed: "The borrower has the item. Confirm the return after you receive it back.",
        returned: request.returned_at
            ? `Returned ${formatBorrowingDate(request.returned_at)}`
            : "Borrowing completed.",
        rejected: "This request was declined."
    }[statusKey] || "";

    return `
        <article class="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
            <div class="flex items-center gap-4 md:min-w-[240px]">
                ${imageMarkup}
                ${avatar(borrowerName)}
            </div>

            <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-gray-900">
                    ${borrowerName} wants to borrow
                    <span class="text-violet-600">${itemName}</span>
                </p>

                ${borrowerEmail ? `<p class="mt-1 text-xs text-gray-400">${borrowerEmail}</p>` : ""}

                <p class="mt-2 text-xs font-medium text-gray-500">
                    ${formatBorrowingDate(request.borrowed_at)} – ${formatBorrowingDate(request.due_date)}
                </p>

                ${statusHint ? `<p class="mt-2 text-[11px] text-gray-400">${escapeHtml(statusHint)}</p>` : ""}
            </div>

            <div class="shrink-0">
                ${statusBadge(status)}
            </div>

            ${actionsMarkup}
            ${messageButton}
        </article>
    `;
}

async function loadBorrowRequests(status = "") {
    const list = document.getElementById("borrowRequestsList");
    const loading = document.getElementById("borrowRequestsLoading");
    const errorBox = document.getElementById("borrowRequestsError");
    const empty = document.getElementById("borrowRequestsEmpty");

    if (!list || !loading || !errorBox || !empty) return;

    list.innerHTML = "";
    errorBox.classList.add("hidden");
    empty.classList.add("hidden");
    loading.classList.remove("hidden");

    try {
        const query = status ? `?status=${encodeURIComponent(status)}` : "";
        const result = await apiRequest(`/received-borrow-requests${query}`, {
            auth: true
        });

        const requests = Array.isArray(result.data) ? result.data : [];

        if (!requests.length) {
            empty.classList.remove("hidden");
            return;
        }

        list.innerHTML = requests.map(renderBorrowRequestCard).join("");
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        errorBox.textContent = error.message;
        errorBox.classList.remove("hidden");
    } finally {
        loading.classList.add("hidden");
    }
}

async function handleBorrowRequestAction(button) {
    const action = button.dataset.borrowAction;
    const requestId = button.dataset.requestId;

    if (!action || !requestId) return;

    const actionArea = button.closest("[data-request-actions]");
    const buttons = actionArea ? [...actionArea.querySelectorAll("button")] : [button];
    const originalLabels = buttons.map(item => item.textContent);

    buttons.forEach(item => {
        item.disabled = true;
    });

    const loadingLabels = {
        approve: "Approving...",
        reject: "Declining...",
        "confirm-returned": "Confirming..."
    };

    button.textContent = loadingLabels[action] || "Updating...";

    try {
        const endpoint = {
            approve: "approve",
            reject: "reject",
            "confirm-returned": "confirm-returned"
        }[action];

        if (!endpoint) return;

        await apiRequest(`/borrowings/${requestId}/${endpoint}`, {
            method: "PATCH",
            auth: true
        });

        const successMessages = {
            approve: [
                "Request approved",
                "This item is now reserved. The borrower can confirm receipt after the handoff."
            ],
            reject: [
                "Request declined",
                "The borrowing request has been declined."
            ],
            "confirm-returned": [
                "Return confirmed",
                "The borrowing is complete and the item is available again."
            ]
        };

        const [title, message] = successMessages[action] || ["Updated", "The borrowing was updated."];
        openModal(title, message);

        const filter = document.getElementById("borrowRequestsFilter");
        await loadBorrowRequests(filter?.value || "");
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        openModal("Could not update request", error.message);

        buttons.forEach((item, index) => {
            item.disabled = false;
            item.textContent = originalLabels[index];
        });
    }
}

function setupBorrowRequests() {
    const list = document.getElementById("borrowRequestsList");
    const filter = document.getElementById("borrowRequestsFilter");

    if (!list) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    filter?.addEventListener("change", () => {
        loadBorrowRequests(filter.value);
    });

    list.addEventListener("click", event => {
        const button = event.target.closest("[data-borrow-action]");

        if (button) {
            handleBorrowRequestAction(button);
        }
    });

    loadBorrowRequests(filter?.value || "");
}

/* ==========================================
   MODAL
========================================== */

function openModal(title, message) {
    const modal = document.createElement("div");

    modal.className =
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4";

    modal.innerHTML = `
        <div class="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl fade-in">

            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                ✓
            </div>

            <h2 class="mt-5 text-center text-xl font-extrabold">
                ${escapeHtml(title)}
            </h2>

            <p class="mt-2 text-center text-sm leading-6 text-gray-500">
                ${escapeHtml(message)}
            </p>

            <button
                onclick="this.closest('.fixed').remove()"
                class="mt-6 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white">
                Done
            </button>

        </div>
    `;

    document.body.appendChild(modal);
}

/* ==========================================
   ADD / EDIT ITEM
========================================== */

async function authenticatedUser() {
    const cached = getCachedUser();
    if (cached?.id) return cached;

    const result = await apiRequest("/me", { auth: true });
    const user = result?.user || null;

    if (user) {
        const storage = localStorage.getItem("borrowly_token") ? localStorage : sessionStorage;
        storage.setItem("borrowly_user", JSON.stringify(user));
    }

    return user;
}

function itemEditIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function setupAddItem() {
    const form = document.getElementById("addItemForm");
    if (!form) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const editId = itemEditIdFromURL();
    const isEdit = Boolean(editId);
    const errorBox = document.getElementById("addItemError");
    const categorySelect = document.getElementById("category");
    const imageInput = document.getElementById("itemImage");
    const imagePreview = document.getElementById("imagePreview");
    const submitButton = document.getElementById("addItemSubmit");
    let previewUrl = null;

    const showError = message => {
        errorBox.textContent = message;
        errorBox.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearError = () => {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    };

    if (isEdit) {
        document.title = "Edit Item — Borrowly";
        document.getElementById("breadcrumbLabel").textContent = "Edit Item";
        document.getElementById("pageTitle").textContent = "Edit Item";
        document.getElementById("pageDescription").textContent = "Update the details borrowers see for this item.";
        submitButton.textContent = "Save Changes";
    }

    imageInput?.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            imageInput.value = "";
            showError("The image must be 2 MB or smaller.");
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        imagePreview.src = previewUrl;
        clearError();
    });

    try {
        const categoriesResult = await apiRequest("/categories");
        const categories = Array.isArray(categoriesResult?.data) ? categoriesResult.data : [];

        categorySelect.innerHTML = `
            <option value="">Select category</option>
            ${categories.map(category => `
                <option value="${Number(category.id)}">${escapeHtml(category.name)}</option>
            `).join("")}
        `;

        if (!categories.length) {
            throw new Error("No categories are available yet. Add categories before listing an item.");
        }

        if (isEdit) {
            const [itemResult, user] = await Promise.all([
                apiRequest(`/items/${editId}`),
                authenticatedUser()
            ]);

            const item = itemResult?.data;
            if (!item) throw new Error("Item not found.");

            if (!user || Number(item.user_id) !== Number(user.id)) {
                submitButton.disabled = true;
                throw new Error("You can only edit items that belong to your account.");
            }

            document.getElementById("itemName").value = item.name || "";
            categorySelect.value = String(item.category_id || "");
            document.getElementById("description").value = item.description || "";
            document.getElementById("condition").value = item.condition || "good";
            document.getElementById("location").value = item.location || "";

            if (item.image) {
                imagePreview.src = item.image;
                document.getElementById("imageHelp").textContent = "Choose a new image only if you want to replace the current photo. Maximum 2 MB.";
            }
        }
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        showError(error.message);
        if (!categorySelect.options.length) {
            categorySelect.innerHTML = `<option value="">Could not load categories</option>`;
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearError();

        submitButton.disabled = true;
        submitButton.textContent = isEdit ? "Saving..." : "Adding...";

        const formData = new FormData();
        formData.append("name", document.getElementById("itemName").value.trim());
        formData.append("category_id", categorySelect.value);
        formData.append("description", document.getElementById("description").value.trim());
        formData.append("condition", document.getElementById("condition").value);
        formData.append("location", document.getElementById("location").value.trim());

        const image = imageInput?.files?.[0];
        if (image) formData.append("image", image);

        try {
            let result;

            if (isEdit) {
                // Method spoofing keeps multipart file uploads reliable in PHP while routing as PATCH.
                formData.append("_method", "PATCH");
                result = await apiRequest(`/items/${editId}`, {
                    method: "POST",
                    auth: true,
                    body: formData
                });
            } else {
                result = await apiRequest("/items", {
                    method: "POST",
                    auth: true,
                    body: formData
                });
            }

            openModal(
                isEdit ? "Item updated" : "Item added",
                isEdit
                    ? "Your item details were saved successfully."
                    : "Your item is now listed and available for the Borrowly community."
            );

            setTimeout(() => {
                window.location.href = "my-items.html";
            }, 500);
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            showError(error.message);
            submitButton.disabled = false;
            submitButton.textContent = isEdit ? "Save Changes" : "Add Item";
        }
    });
}

/* ==========================================
   MY ITEMS
========================================== */

function myItemStatusLabel(status) {
    return {
        available: "Available",
        unavailable: "Reserved",
        borrowed: "Borrowed"
    }[String(status || "").toLowerCase()] || displayStatus(status || "Unavailable");
}

function renderMyItemCard(item) {
    const id = Number(item.id);
    const name = escapeHtml(item.name || "Item");
    const category = escapeHtml(item.category?.name || "Uncategorized");
    const location = escapeHtml(item.location || "Location not specified");
    const condition = escapeHtml(displayStatus(item.condition || "good"));
    const image = item.image ? escapeHtml(item.image) : "https://placehold.co/900x600?text=Borrowly+Item";
    const status = myItemStatusLabel(item.status);
    const ratingValue = Number(item.reviews_avg_rating);
    const ratingText = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "New";
    const reviewsCount = Number(item.reviews_count) || 0;

    return `
        <article class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" data-my-item-card="${id}">
            <a href="item-details.html?id=${id}" class="relative block h-48 overflow-hidden bg-gray-100">
                <img src="${image}" alt="${name}" class="h-full w-full object-cover" onerror="this.src='https://placehold.co/900x600?text=Borrowly+Item'">
                <div class="absolute left-3 top-3">${statusBadge(status)}</div>
            </a>

            <div class="p-5">
                <p class="text-[10px] font-bold uppercase tracking-wide text-violet-600">${category}</p>
                <a href="item-details.html?id=${id}" class="mt-1 block truncate text-lg font-bold text-gray-900">${name}</a>

                <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>${condition} · ${location}</span>
                    <span>★ ${ratingText} (${reviewsCount})</span>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                    <a href="add-item.html?id=${id}" class="rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                        Edit
                    </a>
                    <button type="button" data-delete-item="${id}" class="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                        Delete
                    </button>
                </div>
            </div>
        </article>
    `;
}

function setupMyItems() {
    const list = document.getElementById("myItemsList");
    if (!list) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const loading = document.getElementById("myItemsLoading");
    const empty = document.getElementById("myItemsEmpty");
    const errorBox = document.getElementById("myItemsError");
    const filters = document.getElementById("myItemsFilters");
    const pagination = document.getElementById("myItemsPagination");
    const prev = document.getElementById("myItemsPrev");
    const next = document.getElementById("myItemsNext");
    const pageInfo = document.getElementById("myItemsPageInfo");

    const state = { status: "", page: 1, lastPage: 1 };

    const updateFilterStyles = () => {
        filters.querySelectorAll("[data-my-items-status]").forEach(button => {
            const active = button.dataset.myItemsStatus === state.status;
            button.className = active
                ? "rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white"
                : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600";
        });
    };

    const load = async () => {
        loading.classList.remove("hidden");
        empty.classList.add("hidden");
        errorBox.classList.add("hidden");
        list.innerHTML = "";
        pagination.classList.add("hidden");
        pagination.classList.remove("flex");

        try {
            const params = new URLSearchParams({
                page: String(state.page),
                per_page: "9"
            });
            if (state.status) params.set("status", state.status);

            const result = await apiRequest(`/my-items?${params.toString()}`, { auth: true });
            const items = Array.isArray(result?.data) ? result.data : [];
            const meta = result?.pagination || {};

            state.page = Number(meta.current_page) || 1;
            state.lastPage = Number(meta.last_page) || 1;

            if (!items.length) {
                empty.classList.remove("hidden");
            } else {
                list.innerHTML = items.map(renderMyItemCard).join("");
            }

            if ((Number(meta.total) || 0) > 9 || state.lastPage > 1) {
                pagination.classList.remove("hidden");
                pagination.classList.add("flex");
                pageInfo.textContent = `Page ${state.page} of ${state.lastPage}`;
                prev.disabled = state.page <= 1;
                next.disabled = state.page >= state.lastPage;
            }
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            loading.classList.add("hidden");
        }
    };

    filters.addEventListener("click", event => {
        const button = event.target.closest("[data-my-items-status]");
        if (!button) return;

        state.status = button.dataset.myItemsStatus || "";
        state.page = 1;
        updateFilterStyles();
        load();
    });

    list.addEventListener("click", async event => {
        const button = event.target.closest("[data-delete-item]");
        if (!button) return;

        const itemId = Number(button.dataset.deleteItem);
        if (!itemId) return;

        if (!window.confirm("Delete this item? This action cannot be undone.")) return;

        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Deleting...";

        try {
            await apiRequest(`/items/${itemId}`, {
                method: "DELETE",
                auth: true
            });

            openModal("Item deleted", "The item was removed from your listings.");
            await load();
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            openModal("Could not delete item", error.message);
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    prev?.addEventListener("click", () => {
        if (state.page <= 1) return;
        state.page -= 1;
        load();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    next?.addEventListener("click", () => {
        if (state.page >= state.lastPage) return;
        state.page += 1;
        load();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    updateFilterStyles();
    load();
}

/* ==========================================
   MY BORROWINGS
========================================== */

let myBorrowingsCache = [];

function borrowingStatusKey(borrowing) {
    return String(borrowing?.status || "").toLowerCase();
}

function isBorrowingOverdue(borrowing) {
    if (borrowingStatusKey(borrowing) !== "borrowed" || !borrowing?.due_date) {
        return false;
    }

    const dueDate = new Date(borrowing.due_date);
    if (Number.isNaN(dueDate.getTime())) return false;

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());

    return dueUtc < todayUtc;
}

function borrowingStatusMarkup(borrowing) {
    if (isBorrowingOverdue(borrowing)) {
        return statusBadge("Overdue");
    }

    return statusBadge(displayStatus(borrowingStatusKey(borrowing)));
}

function borrowingDatesText(borrowing) {
    const start = formatBorrowingDate(borrowing.borrowed_at);
    const due = formatBorrowingDate(borrowing.due_date);

    if (borrowingStatusKey(borrowing) === "returned" && borrowing.returned_at) {
        return `
            <div>${start} – ${due}</div>
            <div class="mt-1 text-[11px] text-emerald-600">Returned ${formatBorrowingDate(borrowing.returned_at)}</div>
        `;
    }

    if (isBorrowingOverdue(borrowing)) {
        return `
            <div>${start} – ${due}</div>
            <div class="mt-1 text-[11px] font-semibold text-red-500">Return date has passed</div>
        `;
    }

    return `${start} – ${due}`;
}

function renderMyBorrowingRow(borrowing) {
    const item = borrowing.item || {};
    const owner = item.owner || {};
    const itemId = Number(item.id || borrowing.item_id);
    const itemName = escapeHtml(item.name || "Item");
    const ownerName = escapeHtml(owner.name || "Borrowly member");
    const ownerEmail = owner.email ? escapeHtml(owner.email) : "";
    const statusKey = borrowingStatusKey(borrowing);

    const statusHint = {
        pending: "Waiting for owner approval",
        approved: "Approved — confirm after you receive the item",
        borrowed: "Currently with you",
        returned: "Borrowing completed",
        rejected: "Request was declined"
    }[statusKey] || "";

    const confirmReceivedButton = statusKey === "approved"
        ? `
            <button
                type="button"
                data-my-borrowing-action="confirm-received"
                data-borrowing-id="${Number(borrowing.id)}"
                class="inline-flex rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                Confirm received
            </button>
        `
        : "";

    const existingReview = borrowing.review || null;
    const reviewButton = statusKey === "returned" && Number.isInteger(itemId) && itemId > 0
        ? `
            <button
                type="button"
                data-my-borrowing-action="review"
                data-borrowing-id="${Number(borrowing.id)}"
                class="inline-flex rounded-xl ${existingReview ? "border border-violet-200 bg-violet-50 text-violet-700" : "bg-violet-600 text-white"} px-3.5 py-2 text-xs font-bold transition hover:opacity-90">
                ${existingReview ? `Edit review · ★ ${Number(existingReview.rating) || ""}` : "Leave review"}
            </button>
        `
        : "";

    return `
        <tr class="border-t border-gray-100 align-middle">
            <td class="px-5 py-4">
                <div class="font-semibold text-gray-900">${itemName}</div>
                <div class="mt-1 text-xs text-gray-400">Request #${Number(borrowing.id)}</div>
            </td>

            <td class="px-5 py-4 text-xs font-medium text-gray-500">
                ${borrowingDatesText(borrowing)}
            </td>

            <td class="px-5 py-4">
                <div class="text-xs font-semibold text-gray-700">${ownerName}</div>
                ${ownerEmail ? `<div class="mt-1 text-[11px] text-gray-400">${ownerEmail}</div>` : ""}
            </td>

            <td class="px-5 py-4">
                ${borrowingStatusMarkup(borrowing)}
                ${statusHint ? `<div class="mt-1.5 text-[11px] text-gray-400">${escapeHtml(statusHint)}</div>` : ""}
            </td>

            <td class="px-5 py-4 text-right">
                <div class="flex flex-wrap justify-end gap-2">
                    ${confirmReceivedButton}
                    ${reviewButton}
                    ${!["pending", "rejected"].includes(statusKey) ? `
                        <button type="button"
                                data-my-borrowing-action="report"
                                data-borrowing-id="${Number(borrowing.id)}"
                                class="inline-flex rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50">
                            Report issue
                        </button>
                    ` : ""}
                    ${Number.isInteger(Number(borrowing.id)) && Number(borrowing.id) > 0 ? `
                        <a href="messages.html?borrowing=${encodeURIComponent(borrowing.id)}"
                           class="inline-flex rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">
                            Message owner
                        </a>
                    ` : ""}
                    ${Number.isInteger(itemId) && itemId > 0 ? `
                        <a href="item-details.html?id=${encodeURIComponent(itemId)}"
                           class="inline-flex rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-violet-600 transition hover:border-violet-200 hover:bg-violet-50">
                            View item
                        </a>
                    ` : ""}
                </div>
            </td>
        </tr>
    `;
}

function findBorrowingById(id) {
    return myBorrowingsCache.find(borrowing => Number(borrowing.id) === Number(id)) || null;
}

function openBorrowingReviewModal(borrowingId) {
    const borrowing = findBorrowingById(borrowingId);

    if (!borrowing || borrowingStatusKey(borrowing) !== "returned") {
        openModal("Review unavailable", "You can review an item only after its return has been confirmed.");
        return;
    }

    const item = borrowing.item || {};
    const itemId = Number(item.id || borrowing.item_id);
    const existingReview = borrowing.review || null;
    const existingRating = Number(existingReview?.rating) || 0;
    const modal = document.createElement("div");

    modal.className = "fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4";
    modal.innerHTML = `
        <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-bold uppercase tracking-widest text-violet-600">${existingReview ? "Edit review" : "Leave a review"}</p>
                    <h2 class="mt-1 text-xl font-extrabold text-gray-900">${escapeHtml(item.name || "Item")}</h2>
                    <p class="mt-1 text-sm text-gray-400">Rate your experience after returning this item.</p>
                </div>
                <button type="button" data-review-close class="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700">✕</button>
            </div>

            <form id="borrowlyReviewForm" class="mt-6">
                <input id="borrowlyReviewRating" type="hidden" value="${existingRating}">

                <label class="text-xs font-bold text-gray-600">Your rating</label>
                <div id="borrowlyReviewStars" class="mt-2 flex gap-1" role="radiogroup" aria-label="Rating out of 5">
                    ${[1,2,3,4,5].map(value => `
                        <button type="button" data-review-star="${value}" aria-label="${value} star${value === 1 ? "" : "s"}"
                            class="text-3xl leading-none ${value <= existingRating ? "text-amber-400" : "text-gray-200"} transition hover:scale-110">★</button>
                    `).join("")}
                </div>

                <label for="borrowlyReviewComment" class="mt-6 block text-xs font-bold text-gray-600">Comment <span class="font-normal text-gray-400">(optional)</span></label>
                <textarea id="borrowlyReviewComment" rows="4" maxlength="1000"
                    class="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                    placeholder="Share what the item was like to borrow...">${escapeHtml(existingReview?.comment || "")}</textarea>

                <div id="borrowlyReviewError" class="mt-3 hidden rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"></div>

                <div class="mt-6 flex gap-3">
                    <button type="button" data-review-close class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button id="borrowlyReviewSubmit" type="submit" class="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        ${existingReview ? "Save changes" : "Post review"}
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const ratingInput = modal.querySelector("#borrowlyReviewRating");
    const errorBox = modal.querySelector("#borrowlyReviewError");
    const submitButton = modal.querySelector("#borrowlyReviewSubmit");

    const paintStars = selected => {
        modal.querySelectorAll("[data-review-star]").forEach(star => {
            const value = Number(star.dataset.reviewStar);
            star.classList.toggle("text-amber-400", value <= selected);
            star.classList.toggle("text-gray-200", value > selected);
        });
    };

    modal.querySelectorAll("[data-review-close]").forEach(button => {
        button.addEventListener("click", () => modal.remove());
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    modal.querySelectorAll("[data-review-star]").forEach(star => {
        star.addEventListener("click", () => {
            const value = Number(star.dataset.reviewStar);
            ratingInput.value = String(value);
            paintStars(value);
        });
    });

    modal.querySelector("#borrowlyReviewForm").addEventListener("submit", async event => {
        event.preventDefault();

        const selectedRating = Number(ratingInput.value);
        const comment = modal.querySelector("#borrowlyReviewComment").value.trim();

        errorBox.classList.add("hidden");
        errorBox.textContent = "";

        if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5) {
            errorBox.textContent = "Please choose a rating from 1 to 5 stars.";
            errorBox.classList.remove("hidden");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = existingReview ? "Saving..." : "Posting...";

        try {
            const path = existingReview ? `/reviews/${existingReview.id}` : "/reviews";
            const method = existingReview ? "PUT" : "POST";
            const body = existingReview
                ? { rating: selectedRating, comment: comment || null }
                : { item_id: itemId, rating: selectedRating, comment: comment || null };

            await apiRequest(path, {
                method,
                auth: true,
                body: JSON.stringify(body)
            });

            modal.remove();
            openModal(
                existingReview ? "Review updated" : "Review posted",
                existingReview
                    ? "Your rating and comment were updated successfully."
                    : "Thanks for sharing your experience with this item."
            );
            await loadMyBorrowings();
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
            submitButton.disabled = false;
            submitButton.textContent = existingReview ? "Save changes" : "Post review";
        }
    });
}

async function handleMyBorrowingAction(button) {
    const action = button.dataset.myBorrowingAction;
    const borrowingId = button.dataset.borrowingId;

    if (!borrowingId) return;

    if (action === "review") {
        openBorrowingReviewModal(borrowingId);
        return;
    }

    if (action === "report") {
        openReportModal({ borrowingId: Number(borrowingId), context: "borrowing" });
        return;
    }

    if (action !== "confirm-received") return;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Confirming...";

    try {
        await apiRequest(`/borrowings/${borrowingId}/confirm-received`, {
            method: "PATCH",
            auth: true
        });

        openModal(
            "Receipt confirmed",
            "The item is now marked as borrowed. The owner will confirm when you return it."
        );

        await loadMyBorrowings();
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        openModal("Could not confirm receipt", error.message);
        button.disabled = false;
        button.textContent = originalLabel;
    }
}

function updateMyBorrowingsSummary(borrowings) {
    const statuses = borrowings.map(borrowingStatusKey);

    const active = statuses.filter(status => status === "approved" || status === "borrowed").length;
    const pending = statuses.filter(status => status === "pending").length;
    const completed = statuses.filter(status => status === "returned").length;

    const activeEl = document.getElementById("activeBorrowingsCount");
    const pendingEl = document.getElementById("pendingBorrowingsCount");
    const completedEl = document.getElementById("completedBorrowingsCount");

    if (activeEl) activeEl.textContent = String(active);
    if (pendingEl) pendingEl.textContent = String(pending);
    if (completedEl) completedEl.textContent = String(completed);
}

function renderMyBorrowings(status = "") {
    const rows = document.getElementById("myBorrowingsRows");
    const table = document.getElementById("myBorrowingsTable");
    const empty = document.getElementById("myBorrowingsEmpty");
    const emptyText = document.getElementById("myBorrowingsEmptyText");

    if (!rows || !table || !empty) return;

    const normalizedStatus = String(status || "").toLowerCase();
    const filtered = normalizedStatus
        ? myBorrowingsCache.filter(item => borrowingStatusKey(item) === normalizedStatus)
        : myBorrowingsCache;

    rows.innerHTML = "";
    table.classList.add("hidden");
    empty.classList.add("hidden");

    if (!filtered.length) {
        if (emptyText) {
            emptyText.textContent = normalizedStatus
                ? `You do not have any ${displayStatus(normalizedStatus).toLowerCase()} borrowings.`
                : "Items you request to borrow will appear here.";
        }
        empty.classList.remove("hidden");
        return;
    }

    rows.innerHTML = filtered.map(renderMyBorrowingRow).join("");
    table.classList.remove("hidden");
}

async function loadMyBorrowings() {
    const loading = document.getElementById("myBorrowingsLoading");
    const errorBox = document.getElementById("myBorrowingsError");
    const filter = document.getElementById("myBorrowingsFilter");

    if (!loading || !errorBox) return;

    loading.classList.remove("hidden");
    errorBox.classList.add("hidden");
    errorBox.textContent = "";

    try {
        const result = await apiRequest("/my-borrowings", { auth: true });
        myBorrowingsCache = Array.isArray(result?.data) ? result.data : [];

        updateMyBorrowingsSummary(myBorrowingsCache);
        renderMyBorrowings(filter?.value || "");
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        errorBox.textContent = error.message;
        errorBox.classList.remove("hidden");

        document.getElementById("activeBorrowingsCount").textContent = "—";
        document.getElementById("pendingBorrowingsCount").textContent = "—";
        document.getElementById("completedBorrowingsCount").textContent = "—";
    } finally {
        loading.classList.add("hidden");
    }
}

function setupMyBorrowings() {
    const filter = document.getElementById("myBorrowingsFilter");
    const rows = document.getElementById("myBorrowingsRows");

    if (!rows) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    filter?.addEventListener("change", () => {
        renderMyBorrowings(filter.value);
    });

    rows.addEventListener("click", event => {
        const button = event.target.closest("[data-my-borrowing-action]");

        if (button) {
            handleMyBorrowingAction(button);
        }
    });

    loadMyBorrowings();
}

/* ==========================================
   SIGN UP
========================================== */

function cacheBorrowlyUser(user, preferLocal = null) {
    if (!user) return;

    const useLocal = preferLocal !== null
        ? preferLocal
        : Boolean(localStorage.getItem("borrowly_token"));

    const storage = useLocal ? localStorage : sessionStorage;
    localStorage.removeItem("borrowly_user");
    sessionStorage.removeItem("borrowly_user");
    storage.setItem("borrowly_user", JSON.stringify(user));
}

function safeNextPage(fallback = "browse.html") {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next && !next.includes("://") && !next.startsWith("//")) {
        return next;
    }

    return fallback;
}

function setupSignup() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    const nameInput = document.getElementById("signupName");
    const emailInput = document.getElementById("signupEmail");
    const phoneInput = document.getElementById("signupPhone");
    const passwordInput = document.getElementById("signupPassword");
    const confirmationInput = document.getElementById("signupPasswordConfirmation");
    const submitButton = document.getElementById("signupSubmit");
    const errorBox = document.getElementById("signupError");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        errorBox.classList.add("hidden");
        errorBox.textContent = "";

        if (passwordInput.value !== confirmationInput.value) {
            errorBox.textContent = "Passwords do not match.";
            errorBox.classList.remove("hidden");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {
            const phone = phoneInput.value.trim();
            const result = await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify({
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    phone: phone || null,
                    password: passwordInput.value,
                    password_confirmation: confirmationInput.value
                })
            });

            // New registrations use the current browser session by default.
            setAuthToken(result.token, false);
            cacheBorrowlyUser(result.user, false);
            window.location.href = safeNextPage("browse.html");
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Sign Up";
        }
    });
}

/* ==========================================
   PROFILE
========================================== */

let borrowlyProfileData = null;

function profileInitials(name = "") {
    const initials = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");

    return initials || "U";
}

function formatMemberSince(value) {
    if (!value) return "Borrowly member";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Borrowly member";

    return `Member since ${new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric"
    }).format(date)}`;
}

function setProfileText(id, value, fallback = "—") {
    const element = document.getElementById(id);
    if (element) element.textContent = value || fallback;
}

function renderProfile(payload) {
    const user = payload?.user || {};
    const stats = payload?.stats || {};
    borrowlyProfileData = payload;

    setProfileText("profileAvatar", profileInitials(user.name));
    setProfileText("profileName", user.name, "Borrowly member");
    setProfileText("profileMemberSince", formatMemberSince(user.created_at));
    setProfileText("profileItemsCount", String(stats.items_listed ?? 0), "0");
    setProfileText("profileBorrowsCount", String(stats.borrows ?? 0), "0");

    const rawRating = stats.average_item_rating;
    const rating = rawRating === null || rawRating === undefined ? NaN : Number(rawRating);
    setProfileText(
        "profileRating",
        Number.isFinite(rating) ? `⭐ ${rating.toFixed(1)} average item rating` : "No ratings yet"
    );

    setProfileText("profileViewName", user.name, "—");
    setProfileText("profileViewEmail", user.email, "—");
    setProfileText("profileViewPhone", user.phone, "Not provided");
    setProfileText("profileViewLocation", user.location, "Not provided");
    setProfileText("profileViewBio", user.bio, "No bio yet.");

    const inputs = {
        profileInputName: user.name || "",
        profileInputEmail: user.email || "",
        profileInputPhone: user.phone || "",
        profileInputLocation: user.location || "",
        profileInputBio: user.bio || ""
    };

    Object.entries(inputs).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });

    cacheBorrowlyUser(user);
}

function toggleProfileEdit(editing) {
    const view = document.getElementById("profileView");
    const form = document.getElementById("profileEditForm");
    const editButton = document.getElementById("editProfileButton");
    const editError = document.getElementById("profileEditError");

    if (!view || !form) return;

    view.classList.toggle("hidden", editing);
    form.classList.toggle("hidden", !editing);

    if (editButton) {
        editButton.classList.toggle("hidden", editing);
    }

    if (editError) {
        editError.classList.add("hidden");
        editError.textContent = "";
    }

    if (editing && borrowlyProfileData) {
        renderProfile(borrowlyProfileData);
        document.getElementById("profileInputName")?.focus();
    }
}

async function loadProfile() {
    const loading = document.getElementById("profileLoading");
    const errorBox = document.getElementById("profileError");
    const content = document.getElementById("profileContent");
    const editButton = document.getElementById("editProfileButton");

    try {
        const result = await apiRequest("/profile", { auth: true });
        renderProfile(result);
        content?.classList.remove("hidden");
        editButton?.classList.remove("hidden");
        errorBox?.classList.add("hidden");
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            redirectToLogin();
            return;
        }

        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        }
    } finally {
        loading?.classList.add("hidden");
    }
}

function setupProfile() {
    const form = document.getElementById("profileEditForm");
    if (!form) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    document.getElementById("editProfileButton")?.addEventListener("click", () => {
        toggleProfileEdit(true);
    });

    document.getElementById("cancelProfileEdit")?.addEventListener("click", () => {
        toggleProfileEdit(false);
    });

    document.getElementById("profileLogoutButton")?.addEventListener("click", () => {
        logoutBorrowly();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const saveButton = document.getElementById("profileSaveButton");
        const errorBox = document.getElementById("profileEditError");

        errorBox.classList.add("hidden");
        errorBox.textContent = "";
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const result = await apiRequest("/profile", {
                method: "PATCH",
                auth: true,
                body: JSON.stringify({
                    name: document.getElementById("profileInputName").value.trim(),
                    email: document.getElementById("profileInputEmail").value.trim(),
                    phone: document.getElementById("profileInputPhone").value.trim() || null,
                    location: document.getElementById("profileInputLocation").value.trim() || null,
                    bio: document.getElementById("profileInputBio").value.trim() || null
                })
            });

            const nextPayload = {
                ...(borrowlyProfileData || {}),
                user: result.user
            };

            renderProfile(nextPayload);
            toggleProfileEdit(false);

            const navbarRoot = document.getElementById("navbar");
            if (navbarRoot && typeof navbar === "function") {
                navbarRoot.innerHTML = navbar();
            }

            openModal("Profile updated", "Your personal information was saved successfully.");
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save changes";
        }
    });

    loadProfile();
}


/* ==========================================
   FAVORITES
========================================== */

function favoritesEmptyState() {
    return `
        <div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white p-14 text-center">
            <div class="text-4xl">♡</div>
            <p class="mt-3 font-bold text-gray-700">No favorites yet</p>
            <p class="mt-2 text-sm text-gray-400">Save items you want to come back to later.</p>
            <a href="browse.html" class="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white">Browse items</a>
        </div>
    `;
}

async function setupFavorites() {
    const loading = document.getElementById("favoritesLoading");
    const errorBox = document.getElementById("favoritesError");
    const grid = document.getElementById("favoritesGrid");
    const count = document.getElementById("favoritesCount");
    const pagination = document.getElementById("favoritesPagination");
    const prev = document.getElementById("favoritesPrevPage");
    const next = document.getElementById("favoritesNextPage");
    const pageLabel = document.getElementById("favoritesPageLabel");

    if (!grid) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    let currentPage = 1;

    async function loadFavorites(page = 1) {
        loading?.classList.remove("hidden");
        errorBox?.classList.add("hidden");
        grid.classList.add("hidden");
        pagination?.classList.add("hidden");

        try {
            const result = await apiRequest(`/favorites?per_page=12&page=${page}`, { auth: true });
            const items = Array.isArray(result.data) ? result.data : [];
            const pageData = result.pagination || {};

            borrowlyFavoriteIds.clear();
            items.forEach(item => borrowlyFavoriteIds.add(Number(item.id)));

            const total = Number(pageData.total || 0);
            currentPage = Number(pageData.current_page || 1);
            const lastPage = Math.max(1, Number(pageData.last_page || 1));

            if (count) {
                count.innerHTML = `<strong class="text-gray-900">${total.toLocaleString()}</strong> ${total === 1 ? "saved item" : "saved items"}`;
            }

            grid.innerHTML = items.length
                ? items.map(item => itemCard({ ...item, is_favorited: true }, { favorites: true })).join("")
                : favoritesEmptyState();
            grid.classList.remove("hidden");

            if (lastPage > 1 && pagination) {
                pageLabel.textContent = `Page ${currentPage} of ${lastPage}`;
                prev.disabled = currentPage <= 1;
                next.disabled = currentPage >= lastPage;
                pagination.classList.remove("hidden");
                pagination.classList.add("flex");
            }
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            if (errorBox) {
                errorBox.textContent = error.message;
                errorBox.classList.remove("hidden");
            }
        } finally {
            loading?.classList.add("hidden");
        }
    }

    prev?.addEventListener("click", () => {
        if (currentPage > 1) loadFavorites(currentPage - 1);
    });

    next?.addEventListener("click", () => {
        loadFavorites(currentPage + 1);
    });

    document.addEventListener("borrowly:favorites-changed", event => {
        if (event.detail?.isFavorited === false) {
            loadFavorites(currentPage);
        }
    });

    loadFavorites();
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function updateNotificationBadge(count = 0) {
    const badge = document.getElementById("notificationBadge");
    if (!badge) return;

    const numericCount = Math.max(0, Number(count) || 0);

    if (numericCount === 0) {
        badge.textContent = "";
        badge.classList.add("hidden");
        return;
    }

    badge.textContent = numericCount > 99 ? "99+" : String(numericCount);
    badge.classList.remove("hidden");
}

async function setupNavbarNotifications() {
    if (!document.getElementById("notificationBadge")) return;

    if (!getAuthToken()) {
        updateNotificationBadge(0);
        return;
    }

    try {
        const result = await apiRequest("/notifications/unread-count", { auth: true });
        updateNotificationBadge(result.count);
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            updateNotificationBadge(0);
        }
    }
}

function formatNotificationTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (diffSeconds < 60) return "Just now";

    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
    }).format(date);
}

function notificationVisual(type = "") {
    const visuals = {
        new_borrow_request: { icon: "🤝", bg: "bg-violet-50" },
        borrowing_approved: { icon: "✓", bg: "bg-emerald-50" },
        borrowing_rejected: { icon: "✕", bg: "bg-red-50" },
        item_received: { icon: "📦", bg: "bg-blue-50" },
        item_returned: { icon: "↩", bg: "bg-amber-50" },
        report_resolved: { icon: "✓", bg: "bg-emerald-50" },
        report_dismissed: { icon: "🛡️", bg: "bg-gray-50" }
    };

    return visuals[type] || { icon: "🔔", bg: "bg-gray-50" };
}

function notificationTarget(notification) {
    switch (notification.type) {
        case "new_borrow_request":
        case "item_received":
            return "borrow-requests.html";
        case "borrowing_approved":
        case "borrowing_rejected":
        case "item_returned":
            return "my-borrowings.html";
        default:
            return notification.item_id
                ? `item-details.html?id=${encodeURIComponent(notification.item_id)}`
                : "notifications.html";
    }
}

function notificationCard(notification) {
    const visual = notificationVisual(notification.type);
    const unread = !notification.read_at;
    const target = notificationTarget(notification);

    return `
        <button type="button"
                data-notification-id="${encodeURIComponent(notification.id)}"
                data-notification-unread="${unread ? "true" : "false"}"
                data-notification-target="${escapeHtml(target)}"
                class="flex w-full gap-4 border-b border-gray-100 p-5 text-left transition last:border-b-0 hover:bg-gray-50 ${unread ? "bg-violet-50/30" : "bg-white"}">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${visual.bg} text-lg">
                ${visual.icon}
            </span>

            <span class="min-w-0 flex-1">
                <span class="flex items-start justify-between gap-3">
                    <span class="font-bold text-gray-900">${escapeHtml(notification.title || "Notification")}</span>
                    ${unread ? '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-600"></span>' : ""}
                </span>
                <span class="mt-1 block text-sm leading-6 text-gray-500">${escapeHtml(notification.message || "")}</span>
                <span class="mt-2 block text-[11px] font-medium text-gray-400">${escapeHtml(formatNotificationTime(notification.created_at))}</span>
            </span>
        </button>
    `;
}

function notificationsEmptyState(unreadOnly = false) {
    return `
        <div class="p-14 text-center">
            <div class="text-4xl">🔔</div>
            <h2 class="mt-4 text-lg font-bold text-gray-800">${unreadOnly ? "You're all caught up" : "No notifications yet"}</h2>
            <p class="mt-2 text-sm text-gray-400">
                ${unreadOnly
                    ? "You don't have any unread notifications."
                    : "Borrow requests and borrowing updates will appear here."}
            </p>
        </div>
    `;
}

function setupNotifications() {
    const list = document.getElementById("notificationsList");
    if (!list) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const loading = document.getElementById("notificationsLoading");
    const errorBox = document.getElementById("notificationsError");
    const pagination = document.getElementById("notificationsPagination");
    const prev = document.getElementById("notificationsPrevPage");
    const next = document.getElementById("notificationsNextPage");
    const pageLabel = document.getElementById("notificationsPageLabel");
    const markAllButton = document.getElementById("markAllNotificationsRead");
    const filters = document.querySelectorAll("[data-notification-filter]");

    let currentPage = 1;
    let lastPage = 1;
    let unreadOnly = false;

    function setActiveFilter() {
        filters.forEach(button => {
            const active = button.dataset.notificationFilter === (unreadOnly ? "unread" : "all");
            button.classList.toggle("bg-violet-600", active);
            button.classList.toggle("text-white", active);
            button.classList.toggle("bg-white", !active);
            button.classList.toggle("text-gray-600", !active);
        });
    }

    async function loadNotifications(page = 1) {
        loading?.classList.remove("hidden");
        errorBox?.classList.add("hidden");
        list.classList.add("hidden");
        pagination?.classList.add("hidden");

        try {
            const query = new URLSearchParams({
                per_page: "12",
                page: String(page)
            });

            if (unreadOnly) query.set("unread", "1");

            const result = await apiRequest(`/notifications?${query.toString()}`, { auth: true });
            const notifications = Array.isArray(result.data) ? result.data : [];
            const pageData = result.pagination || {};

            currentPage = Number(pageData.current_page || 1);
            lastPage = Math.max(1, Number(pageData.last_page || 1));

            list.innerHTML = notifications.length
                ? notifications.map(notificationCard).join("")
                : notificationsEmptyState(unreadOnly);
            list.classList.remove("hidden");

            if (lastPage > 1 && pagination) {
                pageLabel.textContent = `Page ${currentPage} of ${lastPage}`;
                prev.disabled = currentPage <= 1;
                next.disabled = currentPage >= lastPage;
                pagination.classList.remove("hidden");
                pagination.classList.add("flex");
            }

            await setupNavbarNotifications();
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            loading?.classList.add("hidden");
        }
    }

    filters.forEach(button => {
        button.addEventListener("click", () => {
            unreadOnly = button.dataset.notificationFilter === "unread";
            currentPage = 1;
            setActiveFilter();
            loadNotifications(1);
        });
    });

    list.addEventListener("click", async event => {
        const card = event.target.closest("[data-notification-id]");
        if (!card) return;

        const id = Number(card.dataset.notificationId);
        const target = card.dataset.notificationTarget || "notifications.html";
        const unread = card.dataset.notificationUnread === "true";

        if (unread && Number.isInteger(id) && id > 0) {
            try {
                await apiRequest(`/notifications/${id}/read`, {
                    method: "PATCH",
                    auth: true
                });
                await setupNavbarNotifications();
            } catch (error) {
                if (error.status === 401) {
                    clearAuthToken();
                    redirectToLogin();
                    return;
                }
            }
        }

        window.location.href = target;
    });

    markAllButton?.addEventListener("click", async () => {
        markAllButton.disabled = true;
        markAllButton.textContent = "Marking...";

        try {
            await apiRequest("/notifications/read-all", {
                method: "PATCH",
                auth: true
            });
            updateNotificationBadge(0);
            loadNotifications(currentPage);
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }

            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        } finally {
            markAllButton.disabled = false;
            markAllButton.textContent = "Mark all as read";
        }
    });

    prev?.addEventListener("click", () => {
        if (currentPage > 1) loadNotifications(currentPage - 1);
    });

    next?.addEventListener("click", () => {
        if (currentPage < lastPage) loadNotifications(currentPage + 1);
    });

    setActiveFilter();
    loadNotifications();
}


/* ==========================================
   REPORTS (USER)
========================================== */

function reportTypeLabel(type = "") {
    return displayStatus(String(type).replaceAll("_", " "));
}

function openReportModal({ itemId = null, borrowingId = null, context = "item" } = {}) {
    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const isBorrowing = Boolean(borrowingId);
    const types = isBorrowing
        ? [
            ["damaged_item", "Damaged item"],
            ["item_not_returned", "Item not returned / return issue"],
            ["inappropriate_behavior", "Inappropriate behavior"],
            ["other", "Other"]
        ]
        : [
            ["incorrect_item", "Incorrect or misleading item"],
            ["inappropriate_listing", "Inappropriate listing"],
            ["other", "Other"]
        ];

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4";
    modal.innerHTML = `
        <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h2 class="text-xl font-extrabold">Report an issue</h2>
                    <p class="mt-1 text-sm text-gray-400">Your report will be visible to Borrowly administrators.</p>
                </div>
                <button type="button" data-report-close class="rounded-xl p-2 text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <form id="borrowlyReportForm" class="mt-5">
                <label class="text-xs font-bold text-gray-600">Issue type</label>
                <select id="borrowlyReportType" class="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500">
                    ${types.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}
                </select>
                <label class="mt-5 block text-xs font-bold text-gray-600">What happened?</label>
                <textarea id="borrowlyReportReason" required minlength="10" maxlength="2000" rows="5" class="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-violet-500" placeholder="Describe the issue clearly..."></textarea>
                <div id="borrowlyReportError" class="mt-3 hidden rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"></div>
                <div class="mt-6 flex gap-3">
                    <button type="button" data-report-close class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600">Cancel</button>
                    <button id="borrowlyReportSubmit" class="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white">Submit report</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(modal);
    modal.querySelectorAll("[data-report-close]").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.addEventListener("click", event => { if (event.target === modal) modal.remove(); });

    modal.querySelector("#borrowlyReportForm").addEventListener("submit", async event => {
        event.preventDefault();
        const type = modal.querySelector("#borrowlyReportType").value;
        const reason = modal.querySelector("#borrowlyReportReason").value.trim();
        const errorBox = modal.querySelector("#borrowlyReportError");
        const submit = modal.querySelector("#borrowlyReportSubmit");

        errorBox.classList.add("hidden");
        if (reason.length < 10) {
            errorBox.textContent = "Please add a little more detail (at least 10 characters).";
            errorBox.classList.remove("hidden");
            return;
        }

        submit.disabled = true;
        submit.textContent = "Submitting...";

        try {
            const payload = { type, reason };
            if (isBorrowing) payload.borrowing_id = Number(borrowingId);
            else payload.item_id = Number(itemId);

            await apiRequest("/reports", {
                method: "POST",
                auth: true,
                body: JSON.stringify(payload)
            });
            modal.remove();
            openModal("Report submitted", "Thanks. An administrator can now review this report.");
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
            submit.disabled = false;
            submit.textContent = "Submit report";
        }
    });
}

/* ==========================================
   ADMIN
========================================== */

function adminPageError(message = "") {
    const box = document.getElementById("adminPageError");
    if (!box) return;
    box.textContent = message;
    box.classList.toggle("hidden", !message);
}

async function requireAdmin() {
    if (!getAuthToken()) {
        window.location.href = `../login.html?next=${encodeURIComponent("admin/" + (window.location.pathname.split("/").pop() || "dashboard.html"))}`;
        throw new Error("AUTH_REDIRECT");
    }

    try {
        const result = await apiRequest("/me", { auth: true });
        const user = result?.user || null;
        if (user) cacheBorrowlyUser(user);
        if (user?.role !== "admin") {
            window.location.href = "../index.html";
            throw new Error("ADMIN_REQUIRED");
        }
        return user;
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            window.location.href = "../login.html";
        }
        throw error;
    }
}

function adminFormatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function adminEmptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="p-10 text-center text-sm text-gray-400">${escapeHtml(message)}</td></tr>`;
}

async function setupAdminDashboard() {
    if (!document.getElementById("adminUsersCount")) return;
    try {
        await requireAdmin();
        const result = await apiRequest("/admin/dashboard", { auth: true });
        const data = result.data || {};
        const stats = data.stats || {};
        document.getElementById("adminUsersCount").textContent = Number(stats.users || 0).toLocaleString();
        document.getElementById("adminItemsCount").textContent = Number(stats.items || 0).toLocaleString();
        document.getElementById("adminActiveBorrowingsCount").textContent = Number(stats.active_borrowings || 0).toLocaleString();
        document.getElementById("adminCompletedBorrowingsCount").textContent = Number(stats.completed_borrowings || 0).toLocaleString();
        document.getElementById("adminPendingRequestsCount").textContent = Number(stats.pending_requests || 0).toLocaleString();
        document.getElementById("adminPendingReportsCount").textContent = Number(stats.pending_reports || 0).toLocaleString();
        document.getElementById("adminReviewsCount").textContent = Number(stats.reviews || 0).toLocaleString();

        const chart = Array.isArray(data.chart) ? data.chart : [];
        const chartEl = document.getElementById("adminBorrowingsChart");
        const peak = Math.max(
            0,
            ...chart.flatMap(point => [Number(point.requests || 0), Number(point.completed || 0)])
        );
        // Keep some visual headroom so a single request does not fill the whole chart.
        const axisMax = Math.max(4, Math.ceil(peak * 1.25));

        chartEl.innerHTML = chart.length
            ? chart.map(point => {
                const requests = Number(point.requests || 0);
                const completed = Number(point.completed || 0);
                const requestHeight = requests ? Math.max(8, (requests / axisMax) * 100) : 0;
                const completedHeight = completed ? Math.max(8, (completed / axisMax) * 100) : 0;

                return `
                    <div class="flex h-full min-w-0 flex-col justify-end">
                        <div class="flex min-h-0 flex-1 items-end justify-center gap-1">
                            <div class="group relative flex h-full w-2.5 items-end justify-center sm:w-4" title="${escapeHtml(point.label)}: ${requests} request${requests === 1 ? "" : "s"}">
                                ${requests ? `<span class="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-violet-600 opacity-0 transition group-hover:opacity-100">${requests}</span>` : ""}
                                <div class="w-full rounded-t-md bg-violet-500 transition-all group-hover:bg-violet-600" style="height:${requestHeight}%"></div>
                            </div>
                            <div class="group relative flex h-full w-2.5 items-end justify-center sm:w-4" title="${escapeHtml(point.label)}: ${completed} returned">
                                ${completed ? `<span class="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-600 opacity-0 transition group-hover:opacity-100">${completed}</span>` : ""}
                                <div class="w-full rounded-t-md bg-emerald-400 transition-all group-hover:bg-emerald-500" style="height:${completedHeight}%"></div>
                            </div>
                        </div>
                        <span class="mt-2 truncate text-center text-[9px] text-gray-400">${escapeHtml(point.label)}</span>
                    </div>`;
            }).join("")
            : `<div class="col-span-full self-center text-center text-sm text-gray-400">No borrowing activity yet.</div>`;

        const recentBorrowings = Array.isArray(data.recent_borrowings) ? data.recent_borrowings : [];
        document.getElementById("adminRecentBorrowings").innerHTML = recentBorrowings.length
            ? recentBorrowings.map(b => `<div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"><div class="min-w-0"><p class="truncate text-sm font-semibold">${escapeHtml(b.item?.name || "Item")}</p><p class="mt-0.5 text-xs text-gray-400">${escapeHtml(b.user?.name || "Borrower")}</p></div>${statusBadge(displayStatus(b.status))}</div>`).join("")
            : `<p class="text-sm text-gray-400">No borrowings yet.</p>`;

        const reports = Array.isArray(data.recent_reports) ? data.recent_reports : [];
        document.getElementById("adminRecentReports").innerHTML = reports.length
            ? reports.map(r => `<div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"><div class="min-w-0"><p class="truncate text-sm font-semibold">${escapeHtml(reportTypeLabel(r.type))}</p><p class="mt-0.5 truncate text-xs text-gray-400">${escapeHtml(r.item?.name || r.reported_user?.name || "Community report")}</p></div>${statusBadge(displayStatus(r.status))}</div>`).join("")
            : `<p class="text-sm text-gray-400">No reports yet.</p>`;
    } catch (error) {
        if (!["AUTH_REDIRECT", "ADMIN_REQUIRED"].includes(error.message)) adminPageError(error.message);
    }
}

function setupAdminUsers() {
    const rows = document.getElementById("adminUsersRows");
    if (!rows) return;
    const search = document.getElementById("adminUsersSearch");
    const role = document.getElementById("adminUsersRole");
    const prev = document.getElementById("adminUsersPrev");
    const next = document.getElementById("adminUsersNext");
    const pageLabel = document.getElementById("adminUsersPage");
    let page = 1, lastPage = 1, timer;

    async function load() {
        try {
            await requireAdmin();
            adminPageError("");
            const q = new URLSearchParams({ page: String(page), per_page: "20" });
            if (search.value.trim()) q.set("search", search.value.trim());
            if (role.value) q.set("role", role.value);
            const result = await apiRequest(`/admin/users?${q}`, { auth: true });
            const users = Array.isArray(result.data) ? result.data : [];
            const pg = result.pagination || {};
            page = Number(pg.current_page || 1); lastPage = Math.max(1, Number(pg.last_page || 1));
            rows.innerHTML = users.length ? users.map(user => `<tr class="border-t border-gray-100">
                <td class="px-5 py-4"><div class="flex items-center gap-3">${avatar(user.name)}<div><p class="text-sm font-semibold">${escapeHtml(user.name)}</p><p class="text-[11px] text-gray-400">#${Number(user.id)}</p></div></div></td>
                <td class="px-5 py-4 text-xs"><p>${escapeHtml(user.email || "")}</p><p class="mt-1 text-gray-400">${escapeHtml(user.phone || user.location || "—")}</p></td>
                <td class="px-5 py-4"><select data-admin-user-role="${Number(user.id)}" class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"><option value="user" ${user.role === "user" ? "selected" : ""}>User</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option></select></td>
                <td class="px-5 py-4 text-xs">${Number(user.items_count || 0)}</td><td class="px-5 py-4 text-xs">${Number(user.borrowings_count || 0)}</td><td class="px-5 py-4 text-xs text-gray-400">${escapeHtml(adminFormatDate(user.created_at))}</td>
                <td class="px-5 py-4 text-right"><button data-admin-user-delete="${Number(user.id)}" class="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Delete</button></td></tr>`).join("") : adminEmptyRow(7, "No users found.");
            pageLabel.textContent = `Page ${page} of ${lastPage}`; prev.disabled = page <= 1; next.disabled = page >= lastPage;
        } catch (error) { if (!["AUTH_REDIRECT", "ADMIN_REQUIRED"].includes(error.message)) adminPageError(error.message); }
    }
    search.addEventListener("input", () => { clearTimeout(timer); timer=setTimeout(()=>{page=1;load();},300); }); role.addEventListener("change",()=>{page=1;load();});
    prev.addEventListener("click",()=>{if(page>1){page--;load();}}); next.addEventListener("click",()=>{if(page<lastPage){page++;load();}});
    rows.addEventListener("change", async event => { const select=event.target.closest("[data-admin-user-role]"); if(!select)return; select.disabled=true; try { await apiRequest(`/admin/users/${select.dataset.adminUserRole}/role`,{method:"PATCH",auth:true,body:JSON.stringify({role:select.value})}); openModal("Role updated","The user's role was updated successfully."); await load(); } catch(error){adminPageError(error.message);await load();} });
    rows.addEventListener("click", async event => { const button=event.target.closest("[data-admin-user-delete]"); if(!button)return; if(!confirm("Delete this user? This only works for accounts with no marketplace history."))return; button.disabled=true; try{await apiRequest(`/admin/users/${button.dataset.adminUserDelete}`,{method:"DELETE",auth:true});await load();}catch(error){adminPageError(error.message);button.disabled=false;} });
    load();
}

function setupAdminItems() {
    const rows=document.getElementById("adminItemsRows"); if(!rows)return;
    const search=document.getElementById("adminItemsSearch"), status=document.getElementById("adminItemsStatus"), category=document.getElementById("adminItemsCategory"), prev=document.getElementById("adminItemsPrev"), next=document.getElementById("adminItemsNext"), pageLabel=document.getElementById("adminItemsPage"), categoryList=document.getElementById("adminCategoryList"), categoryForm=document.getElementById("adminCategoryForm"), categoryName=document.getElementById("adminCategoryName");
    let page=1,lastPage=1,timer,categories=[];
    async function loadCategories(){ const result=await apiRequest("/categories"); categories=Array.isArray(result.data)?result.data:[]; category.innerHTML=`<option value="">All categories</option>${categories.map(c=>`<option value="${Number(c.id)}">${escapeHtml(c.name)}</option>`).join("")}`; categoryList.innerHTML=categories.length?categories.map(c=>`<span class="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs"><strong>${escapeHtml(c.name)}</strong><span class="text-gray-400">${Number(c.items_count||0)}</span><button data-category-rename="${Number(c.id)}" class="text-violet-500">Rename</button><button data-category-delete="${Number(c.id)}" class="text-red-400">×</button></span>`).join(""):`<span class="text-xs text-gray-400">No categories yet.</span>`; }
    async function load(){ try{await requireAdmin();adminPageError("");const q=new URLSearchParams({page:String(page),per_page:"20"});if(search.value.trim())q.set("search",search.value.trim());if(status.value)q.set("status",status.value);if(category.value)q.set("category_id",category.value);const result=await apiRequest(`/admin/items?${q}`,{auth:true});const items=Array.isArray(result.data)?result.data:[],pg=result.pagination||{};page=Number(pg.current_page||1);lastPage=Math.max(1,Number(pg.last_page||1));rows.innerHTML=items.length?items.map(item=>`<tr class="border-t border-gray-100"><td class="px-5 py-4"><div class="flex items-center gap-3"><img src="${escapeHtml(item.image||'https://placehold.co/80x80?text=Item')}" class="h-10 w-10 rounded-lg bg-gray-100 object-cover"><div><p class="text-sm font-semibold">${escapeHtml(item.name)}</p><p class="text-[11px] text-gray-400">#${Number(item.id)}</p></div></div></td><td class="px-5 py-4 text-xs"><p class="font-semibold">${escapeHtml(item.owner?.name||'—')}</p><p class="mt-1 text-gray-400">${escapeHtml(item.owner?.email||'')}</p></td><td class="px-5 py-4 text-xs">${escapeHtml(item.category?.name||'—')}</td><td class="px-5 py-4">${statusBadge(displayStatus(item.status))}</td><td class="px-5 py-4 text-xs">${Number(item.reviews_count||0)}</td><td class="px-5 py-4 text-xs text-gray-400">${escapeHtml(adminFormatDate(item.created_at))}</td><td class="px-5 py-4 text-right"><a href="../item-details.html?id=${Number(item.id)}" class="mr-2 text-xs font-bold text-violet-600">View</a><button data-admin-item-delete="${Number(item.id)}" class="text-xs font-bold text-red-500">Delete</button></td></tr>`).join(""):adminEmptyRow(7,"No items found.");pageLabel.textContent=`Page ${page} of ${lastPage}`;prev.disabled=page<=1;next.disabled=page>=lastPage;}catch(error){if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);} }
    async function init(){try{await requireAdmin();await loadCategories();await load();}catch(error){if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);}}
    search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;load();},300);});status.addEventListener("change",()=>{page=1;load();});category.addEventListener("change",()=>{page=1;load();});prev.addEventListener("click",()=>{if(page>1){page--;load();}});next.addEventListener("click",()=>{if(page<lastPage){page++;load();}});
    rows.addEventListener("click",async event=>{const button=event.target.closest("[data-admin-item-delete]");if(!button)return;if(!confirm("Delete this item? Active borrowings block deletion."))return;button.disabled=true;try{await apiRequest(`/admin/items/${button.dataset.adminItemDelete}`,{method:"DELETE",auth:true});await loadCategories();await load();}catch(error){adminPageError(error.message);button.disabled=false;}});
    categoryForm.addEventListener("submit",async event=>{event.preventDefault();const name=categoryName.value.trim();if(!name)return;try{await apiRequest("/categories",{method:"POST",auth:true,body:JSON.stringify({name})});categoryName.value="";await loadCategories();}catch(error){adminPageError(error.message);}});
    categoryList.addEventListener("click",async event=>{const rename=event.target.closest("[data-category-rename]"),del=event.target.closest("[data-category-delete]");if(rename){const current=categories.find(c=>Number(c.id)===Number(rename.dataset.categoryRename));const name=prompt("New category name:",current?.name||"");if(!name?.trim())return;try{await apiRequest(`/categories/${rename.dataset.categoryRename}`,{method:"PATCH",auth:true,body:JSON.stringify({name:name.trim()})});await loadCategories();await load();}catch(error){adminPageError(error.message);}}if(del){if(!confirm("Delete this category? It must be empty."))return;try{await apiRequest(`/categories/${del.dataset.categoryDelete}`,{method:"DELETE",auth:true});await loadCategories();await load();}catch(error){adminPageError(error.message);}}});
    init();
}

function setupAdminBorrowings(){const rows=document.getElementById("adminBorrowingsRows");if(!rows)return;const search=document.getElementById("adminBorrowingsSearch"),status=document.getElementById("adminBorrowingsStatus"),prev=document.getElementById("adminBorrowingsPrev"),next=document.getElementById("adminBorrowingsNext"),pageLabel=document.getElementById("adminBorrowingsPage");let page=1,lastPage=1,timer;
    const actions={pending:[["approved","Approve"],["rejected","Reject"]],approved:[["borrowed","Mark borrowed"]],borrowed:[["returned","Mark returned"]]};
    async function load(){try{await requireAdmin();adminPageError("");const q=new URLSearchParams({page:String(page),per_page:"25"});if(search.value.trim())q.set("search",search.value.trim());if(status.value)q.set("status",status.value);const result=await apiRequest(`/borrowings?${q}`,{auth:true});const list=Array.isArray(result.data)?result.data:[],pg=result.pagination||{};page=Number(pg.current_page||1);lastPage=Math.max(1,Number(pg.last_page||1));rows.innerHTML=list.length?list.map(b=>{const nextActions=actions[b.status]||[];return `<tr class="border-t border-gray-100"><td class="px-5 py-4 text-xs">#B${Number(b.id)}</td><td class="px-5 py-4 text-sm font-semibold">${escapeHtml(b.item?.name||'Item')}</td><td class="px-5 py-4 text-xs">${escapeHtml(b.item?.owner?.name||'—')}</td><td class="px-5 py-4 text-xs">${escapeHtml(b.user?.name||'—')}</td><td class="px-5 py-4 text-xs text-gray-500">${formatBorrowingDate(b.borrowed_at)} – ${formatBorrowingDate(b.due_date)}</td><td class="px-5 py-4">${statusBadge(displayStatus(b.status))}</td><td class="px-5 py-4 text-right">${nextActions.map(([value,label])=>`<button data-admin-borrowing-id="${Number(b.id)}" data-admin-borrowing-status="${value}" class="ml-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold ${value==='rejected'?'text-red-500':'text-violet-600'}">${label}</button>`).join('')||'<span class="text-xs text-gray-300">No action</span>'}</td></tr>`}).join(""):adminEmptyRow(7,"No borrowings found.");pageLabel.textContent=`Page ${page} of ${lastPage}`;prev.disabled=page<=1;next.disabled=page>=lastPage;}catch(error){if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);}}
    search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;load();},300);});status.addEventListener("change",()=>{page=1;load();});prev.addEventListener("click",()=>{if(page>1){page--;load();}});next.addEventListener("click",()=>{if(page<lastPage){page++;load();}});rows.addEventListener("click",async event=>{const button=event.target.closest("[data-admin-borrowing-id]");if(!button)return;if(!confirm(`Change this borrowing to ${button.dataset.adminBorrowingStatus}?`))return;button.disabled=true;try{await apiRequest(`/borrowings/${button.dataset.adminBorrowingId}`,{method:"PUT",auth:true,body:JSON.stringify({status:button.dataset.adminBorrowingStatus})});await load();}catch(error){adminPageError(error.message);button.disabled=false;}});requireAdmin().then(load).catch(error=>{if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);});}

function setupAdminReports(){const rows=document.getElementById("adminReportsRows");if(!rows)return;const search=document.getElementById("adminReportsSearch"),status=document.getElementById("adminReportsStatus"),prev=document.getElementById("adminReportsPrev"),next=document.getElementById("adminReportsNext"),pageLabel=document.getElementById("adminReportsPage"),exportButton=document.getElementById("adminReportsExport");let page=1,lastPage=1,timer;
    async function load(){try{await requireAdmin();adminPageError("");const q=new URLSearchParams({page:String(page),per_page:"20"});if(search.value.trim())q.set("search",search.value.trim());if(status.value)q.set("status",status.value);const result=await apiRequest(`/admin/reports?${q}`,{auth:true});const reports=Array.isArray(result.data)?result.data:[],pg=result.pagination||{};page=Number(pg.current_page||1);lastPage=Math.max(1,Number(pg.last_page||1));rows.innerHTML=reports.length?reports.map(r=>`<tr class="border-t border-gray-100 align-top"><td class="px-5 py-4 text-xs">#${Number(r.id)}</td><td class="px-5 py-4 text-xs font-semibold">${escapeHtml(reportTypeLabel(r.type))}</td><td class="px-5 py-4 text-xs">${escapeHtml(r.reporter?.name||'—')}</td><td class="px-5 py-4 text-xs">${escapeHtml(r.item?.name||r.reported_user?.name||'—')}</td><td class="max-w-xs px-5 py-4 text-xs leading-5 text-gray-500">${escapeHtml(r.reason||'')}</td><td class="px-5 py-4">${statusBadge(displayStatus(r.status))}</td><td class="px-5 py-4 text-xs text-gray-400">${escapeHtml(adminFormatDate(r.created_at))}</td><td class="px-5 py-4 text-right">${r.status==='pending'?`<button data-admin-report="${Number(r.id)}" data-report-status="resolved" class="ml-2 text-xs font-bold text-emerald-600">Resolve</button><button data-admin-report="${Number(r.id)}" data-report-status="dismissed" class="ml-2 text-xs font-bold text-gray-500">Dismiss</button>`:`<button data-admin-report="${Number(r.id)}" data-report-status="pending" class="text-xs font-bold text-violet-600">Reopen</button>`}</td></tr>`).join(""):adminEmptyRow(8,"No reports found.");pageLabel.textContent=`Page ${page} of ${lastPage}`;prev.disabled=page<=1;next.disabled=page>=lastPage;}catch(error){if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);}}
    search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;load();},300);});status.addEventListener("change",()=>{page=1;load();});prev.addEventListener("click",()=>{if(page>1){page--;load();}});next.addEventListener("click",()=>{if(page<lastPage){page++;load();}});rows.addEventListener("click",async event=>{const button=event.target.closest("[data-admin-report]");if(!button)return;let note=null;if(button.dataset.reportStatus==='resolved')note=prompt("Optional admin note:")||null;button.disabled=true;try{await apiRequest(`/admin/reports/${button.dataset.adminReport}`,{method:"PATCH",auth:true,body:JSON.stringify({status:button.dataset.reportStatus,admin_note:note})});await load();}catch(error){adminPageError(error.message);button.disabled=false;}});
    exportButton.addEventListener("click",async()=>{exportButton.disabled=true;exportButton.textContent="Exporting...";try{await requireAdmin();const token=getAuthToken();const response=await fetch(`${BORROWLY_API_BASE}/admin/reports-export`,{headers:{Accept:"text/csv",Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Could not export reports.");const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="borrowly-reports.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(error){adminPageError(error.message);}finally{exportButton.disabled=false;exportButton.textContent="Export CSV";}});requireAdmin().then(load).catch(error=>{if(!["AUTH_REDIRECT","ADMIN_REQUIRED"].includes(error.message))adminPageError(error.message);});}

/* ==========================================
   MESSAGES / CHAT
========================================== */

function updateMessageBadge(count = 0) {
    const badge = document.getElementById("messageBadge");
    if (!badge) return;

    const numericCount = Math.max(0, Number(count) || 0);

    if (numericCount === 0) {
        badge.textContent = "";
        badge.classList.add("hidden");
        return;
    }

    badge.textContent = numericCount > 99 ? "99+" : String(numericCount);
    badge.classList.remove("hidden");
}

async function setupNavbarMessages() {
    if (!document.getElementById("messageBadge")) return;

    if (!getAuthToken()) {
        updateMessageBadge(0);
        return;
    }

    try {
        const result = await apiRequest("/messages/unread-count", { auth: true });
        updateMessageBadge(result.count);
    } catch (error) {
        if (error.status === 401) {
            clearAuthToken();
            updateMessageBadge(0);
        }
    }
}

function messageTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) {
        return new Intl.DateTimeFormat("en", {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric"
    }).format(date);
}

function initials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part.charAt(0)).join("") || "?").toUpperCase();
}

function conversationPreview(conversation) {
    const counterpartName = conversation.counterpart?.name || "Borrowly member";
    const itemName = conversation.item?.name || "Borrowed item";
    const lastMessage = conversation.last_message?.body || `Conversation about ${itemName}`;
    const unread = Number(conversation.unread_count || 0);
    const active = String(conversation.id) === String(window.borrowlyActiveConversationId || "");

    return `
        <button type="button"
                data-conversation-id="${Number(conversation.id)}"
                class="flex w-full gap-3 border-b border-gray-100 p-4 text-left transition hover:bg-gray-50 ${active ? "bg-violet-50/70" : "bg-white"}">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                ${escapeHtml(initials(counterpartName))}
            </span>
            <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-bold text-gray-900">${escapeHtml(counterpartName)}</span>
                    <span class="shrink-0 text-[10px] text-gray-400">${escapeHtml(messageTime(conversation.last_message?.created_at || conversation.updated_at))}</span>
                </span>
                <span class="mt-0.5 block truncate text-[11px] font-semibold text-violet-500">${escapeHtml(itemName)}</span>
                <span class="mt-1 flex items-center gap-2">
                    <span class="min-w-0 flex-1 truncate text-xs ${unread ? "font-semibold text-gray-700" : "text-gray-400"}">${escapeHtml(lastMessage)}</span>
                    ${unread ? `<span class="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">${unread > 99 ? "99+" : unread}</span>` : ""}
                </span>
            </span>
        </button>
    `;
}

function messageBubble(message, myUserId) {
    const mine = Number(message.sender_id) === Number(myUserId);
    const senderName = message.sender?.name || "Borrowly member";

    return `
        <div class="flex ${mine ? "justify-end" : "justify-start"}" data-message-id="${Number(message.id)}">
            <div class="max-w-[85%] sm:max-w-md">
                ${mine ? "" : `<p class="mb-1 px-1 text-[10px] font-semibold text-gray-400">${escapeHtml(senderName)}</p>`}
                <div class="rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-tr-sm bg-violet-600 text-white" : "rounded-tl-sm bg-white text-gray-700 shadow-sm"}">
                    <p class="whitespace-pre-wrap break-words">${escapeHtml(message.body || "")}</p>
                    <p class="mt-1 text-right text-[10px] ${mine ? "text-violet-200" : "text-gray-300"}">${escapeHtml(messageTime(message.created_at))}</p>
                </div>
            </div>
        </div>
    `;
}

function messagesEmptyMarkup() {
    return `
        <div class="flex min-h-[360px] items-center justify-center text-center">
            <div>
                <div class="text-4xl">👋</div>
                <p class="mt-3 text-sm font-bold text-gray-700">No messages yet</p>
                <p class="mt-1 text-xs text-gray-400">Send the first message to coordinate the borrowing.</p>
            </div>
        </div>
    `;
}

function conversationsEmptyMarkup(search = "") {
    return `
        <div class="p-10 text-center">
            <div class="text-3xl">💬</div>
            <p class="mt-3 text-sm font-bold text-gray-700">${search ? "No conversations found" : "No conversations yet"}</p>
            <p class="mt-1 text-xs leading-5 text-gray-400">${search ? "Try a different name, item, or message." : "Use Message on a borrow request or borrowing to start a chat."}</p>
        </div>
    `;
}

function setupMessages() {
    const conversationsList = document.getElementById("conversationsList");
    if (!conversationsList) return;

    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    const searchInput = document.getElementById("messagesSearch");
    const conversationsLoading = document.getElementById("conversationsLoading");
    const errorBox = document.getElementById("messagesError");
    const chatEmpty = document.getElementById("chatEmpty");
    const chatPanel = document.getElementById("chatPanel");
    const chatAvatar = document.getElementById("chatAvatar");
    const chatName = document.getElementById("chatName");
    const chatContext = document.getElementById("chatContext");
    const chatItemLink = document.getElementById("chatItemLink");
    const messagesLoading = document.getElementById("messagesLoading");
    const messagesList = document.getElementById("messagesList");
    const messageForm = document.getElementById("messageForm");
    const messageInput = document.getElementById("messageInput");
    const messageSend = document.getElementById("messageSend");

    const cachedUser = getCachedUser();
    let myUserId = Number(cachedUser?.id || 0);
    let conversations = [];
    let activeConversation = null;
    let pollingTimer = null;
    let searchTimer = null;
    let loadingMessages = false;

    window.borrowlyActiveConversationId = null;

    function showError(message) {
        if (!errorBox) return;
        errorBox.textContent = message;
        errorBox.classList.remove("hidden");
    }

    function hideError() {
        errorBox?.classList.add("hidden");
    }

    function renderConversationList() {
        const search = searchInput?.value.trim() || "";
        conversationsList.innerHTML = conversations.length
            ? conversations.map(conversationPreview).join("")
            : conversationsEmptyMarkup(search);
        conversationsList.classList.remove("hidden");
    }

    async function loadConversations({ preserveActive = true, showLoader = false } = {}) {
        if (showLoader) {
            conversationsLoading?.classList.remove("hidden");
            conversationsList.classList.add("hidden");
        }

        try {
            const query = new URLSearchParams({ per_page: "50" });
            const search = searchInput?.value.trim();
            if (search) query.set("search", search);

            const result = await apiRequest(`/conversations?${query.toString()}`, { auth: true });
            conversations = Array.isArray(result.data) ? result.data : [];

            if (preserveActive && activeConversation) {
                const refreshed = conversations.find(item => Number(item.id) === Number(activeConversation.id));
                if (refreshed) activeConversation = refreshed;
            }

            renderConversationList();
            await setupNavbarMessages();
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }
            showError(error.message);
        } finally {
            conversationsLoading?.classList.add("hidden");
        }
    }

    async function ensureUserId() {
        if (myUserId > 0) return myUserId;
        try {
            const user = await authenticatedUser();
            myUserId = Number(user?.id || 0);
        } catch (_) {
            myUserId = 0;
        }
        return myUserId;
    }

    function renderChatHeader(conversation) {
        const counterpartName = conversation.counterpart?.name || "Borrowly member";
        const itemName = conversation.item?.name || "Borrowed item";
        const status = displayStatus(conversation.borrowing?.status || "");

        chatAvatar.textContent = initials(counterpartName);
        chatName.textContent = counterpartName;
        chatContext.textContent = status ? `${itemName} · ${status}` : itemName;

        const itemId = Number(conversation.item?.id || conversation.item_id);
        if (Number.isInteger(itemId) && itemId > 0) {
            chatItemLink.href = `item-details.html?id=${encodeURIComponent(itemId)}`;
            chatItemLink.classList.remove("hidden");
        } else {
            chatItemLink.classList.add("hidden");
        }
    }

    async function loadMessages({ scroll = true, silent = false } = {}) {
        if (!activeConversation || loadingMessages) return;
        loadingMessages = true;

        if (!silent) {
            messagesLoading?.classList.remove("hidden");
            messagesList.classList.add("hidden");
        }

        try {
            await ensureUserId();
            const result = await apiRequest(`/conversations/${activeConversation.id}/messages?limit=100`, { auth: true });
            const messages = Array.isArray(result.data) ? result.data : [];

            messagesList.innerHTML = messages.length
                ? messages.map(message => messageBubble(message, myUserId)).join("")
                : messagesEmptyMarkup();
            messagesList.classList.remove("hidden");

            if (scroll) {
                requestAnimationFrame(() => {
                    messagesList.scrollTop = messagesList.scrollHeight;
                });
            }

            await loadConversations({ preserveActive: true, showLoader: false });
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }
            if (!silent) showError(error.message);
        } finally {
            messagesLoading?.classList.add("hidden");
            loadingMessages = false;
        }
    }

    async function selectConversation(conversation, { updateUrl = true } = {}) {
        if (!conversation) return;

        activeConversation = conversation;
        window.borrowlyActiveConversationId = Number(conversation.id);
        renderConversationList();
        renderChatHeader(conversation);

        chatEmpty.classList.add("hidden");
        chatPanel.classList.remove("hidden");
        chatPanel.classList.add("flex");
        hideError();

        if (updateUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("conversation", conversation.id);
            url.searchParams.delete("borrowing");
            history.replaceState({}, "", url);
        }

        await loadMessages({ scroll: true });
        messageInput?.focus();
    }

    async function openFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const borrowingId = Number(params.get("borrowing"));
        const conversationId = Number(params.get("conversation"));

        try {
            if (Number.isInteger(borrowingId) && borrowingId > 0) {
                const result = await apiRequest(`/borrowings/${borrowingId}/conversation`, {
                    method: "POST",
                    auth: true
                });
                const conversation = result.data;
                await loadConversations({ preserveActive: false });
                await selectConversation(conversation);
                return;
            }

            if (Number.isInteger(conversationId) && conversationId > 0) {
                const result = await apiRequest(`/conversations/${conversationId}`, { auth: true });
                await selectConversation(result.data, { updateUrl: false });
                return;
            }

            if (conversations.length) {
                await selectConversation(conversations[0]);
            }
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }
            showError(error.message);
        }
    }

    conversationsList.addEventListener("click", event => {
        const button = event.target.closest("[data-conversation-id]");
        if (!button) return;

        const id = Number(button.dataset.conversationId);
        const conversation = conversations.find(item => Number(item.id) === id);
        if (conversation) selectConversation(conversation);
    });

    searchInput?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            loadConversations({ preserveActive: true, showLoader: true });
        }, 300);
    });

    messageInput?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            messageForm?.requestSubmit();
        }
    });

    messageForm?.addEventListener("submit", async event => {
        event.preventDefault();
        if (!activeConversation) return;

        const body = messageInput.value.trim();
        if (!body) return;

        messageSend.disabled = true;
        messageInput.disabled = true;
        hideError();

        try {
            await apiRequest(`/conversations/${activeConversation.id}/messages`, {
                method: "POST",
                auth: true,
                body: JSON.stringify({ body })
            });
            messageInput.value = "";
            await loadMessages({ scroll: true });
        } catch (error) {
            if (error.status === 401) {
                clearAuthToken();
                redirectToLogin();
                return;
            }
            showError(error.message);
        } finally {
            messageSend.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    });

    async function initialize() {
        hideError();
        await loadConversations({ preserveActive: false, showLoader: true });
        await openFromQuery();

        pollingTimer = window.setInterval(async () => {
            if (document.hidden) return;
            if (activeConversation) {
                await loadMessages({ scroll: false, silent: true });
            } else {
                await loadConversations({ preserveActive: true });
            }
        }, 5000);
    }

    window.addEventListener("beforeunload", () => {
        if (pollingTimer) clearInterval(pollingTimer);
    }, { once: true });

    initialize();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        setupNavbarNotifications();
        setupNavbarMessages();
    });
}
