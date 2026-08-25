function getItemFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    return (
        BORROWLY_ITEMS.find(item => item.id === id) ||
        BORROWLY_ITEMS[0]
    );
}


/* ==========================================
   BROWSE FILTER
========================================== */

function setupBrowse() {
    const input = document.getElementById("searchInput");
    const grid = document.getElementById("itemsGrid");

    if (!input || !grid) return;

    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");

    function renderItems() {
        const search = input.value.toLowerCase();

        const filtered = BORROWLY_ITEMS.filter(item => {
            const matchesSearch =
                !search ||
                item.name.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search) ||
                item.owner.toLowerCase().includes(search);

            const matchesCategory =
                !category ||
                item.category === category;

            return matchesSearch && matchesCategory;
        });

        grid.innerHTML = filtered.length
            ? filtered.map(itemCard).join("")
            : `
                <div class="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
                    <p class="font-bold text-gray-700">
                        No items found
                    </p>
                    <p class="mt-2 text-sm text-gray-400">
                        Try another search.
                    </p>
                </div>
            `;
    }

    input.addEventListener("input", renderItems);

    renderItems();
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
                ${title}
            </h2>

            <p class="mt-2 text-center text-sm leading-6 text-gray-500">
                ${message}
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