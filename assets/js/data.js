const BORROWLY_ITEMS = [
    {
        id: 1,
        name: "Canon EOS 250D",
        category: "Electronics",
        owner: "Sara Ahmed",
        price: 12,
        rating: 4.9,
        reviews: 28,
        location: "Downtown",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85",
        description:
            "A lightweight DSLR perfect for travel photography, events and content creation."
    },
    {
        id: 2,
        name: "Bosch Power Drill",
        category: "Tools",
        owner: "Ahmad Nabil",
        price: 8,
        rating: 4.8,
        reviews: 19,
        location: "West End",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=85",
        description:
            "Cordless power drill with multiple bits, ideal for home improvement projects."
    },
    {
        id: 3,
        name: "Camping Tent 4P",
        category: "Camping",
        owner: "Omar Khan",
        price: 15,
        rating: 4.7,
        reviews: 14,
        location: "North Hills",
        status: "Reserved",
        image:
            "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=85",
        description:
            "Spacious waterproof four-person camping tent with easy setup."
    },
    {
        id: 4,
        name: "Acoustic Guitar",
        category: "Music",
        owner: "Lina Ali",
        price: 10,
        rating: 5,
        reviews: 32,
        location: "Central",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=900&q=85",
        description:
            "Warm sounding acoustic guitar, great for beginners and casual performances."
    },
    {
        id: 5,
        name: "PlayStation 5",
        category: "Gaming",
        owner: "Yazan M.",
        price: 18,
        rating: 4.9,
        reviews: 41,
        location: "Downtown",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=85",
        description:
            "PlayStation 5 console with controller and selected games."
    },
    {
        id: 6,
        name: "Mountain Bike",
        category: "Sports",
        owner: "Rania H.",
        price: 14,
        rating: 4.6,
        reviews: 11,
        location: "East Park",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=85",
        description:
            "Comfortable mountain bike suitable for trails and weekend adventures."
    },
    {
        id: 7,
        name: "Projector BenQ",
        category: "Electronics",
        owner: "Mohammed D.",
        price: 20,
        rating: 4.8,
        reviews: 17,
        location: "Central",
        status: "Available",
        image:
            "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=85",
        description:
            "Full HD projector for movie nights, presentations and gaming."
    },
    {
        id: 8,
        name: "Hiking Backpack",
        category: "Camping",
        owner: "Huda S.",
        price: 7,
        rating: 4.7,
        reviews: 9,
        location: "North Hills",
        status: "Unavailable",
        image:
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
        description:
            "Durable 45L hiking backpack with rain cover and multiple compartments."
    }
];

const BORROWLY_CATEGORIES = [
    {
        name: "Electronics",
        count: 482,
        icon: "💻"
    },
    {
        name: "Tools",
        count: 316,
        icon: "🔧"
    },
    {
        name: "Camping",
        count: 254,
        icon: "⛺"
    },
    {
        name: "Sports",
        count: 198,
        icon: "⚽"
    },
    {
        name: "Music",
        count: 143,
        icon: "🎸"
    },
    {
        name: "Books",
        count: 529,
        icon: "📚"
    }
];