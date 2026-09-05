function getBook(id) {
    return books.find(book => book.id === Number(id));
}


function getCart() {
    return JSON.parse(
        localStorage.getItem("cart") || "[]"
    );
}


function saveCart(cart) {
    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );
}


function addToCart(id) {

    const cart = getCart();

    if (!cart.includes(Number(id))) {
        cart.push(Number(id));
    }

    saveCart(cart);

    alert("Book added to cart!");

    updateCartCount();
}


function removeFromCart(id) {

    let cart = getCart();

    cart = cart.filter(
        bookId => bookId !== Number(id)
    );

    saveCart(cart);

    location.reload();
}


function updateCartCount() {

    const cart = getCart();

    const elements =
        document.querySelectorAll(".cart-count");

    elements.forEach(element => {
        element.textContent = cart.length;
    });
}


function money(amount) {
    return "₹" + amount;
}


function createBookCard(book) {

    return `
        <article class="book-card">

            <a href="book.html?id=${book.id}">
                <img
                    src="${book.cover}"
                    alt="${book.title}"
                >
            </a>

            <div class="book-info">

                <span class="category">
                    ${book.category}
                </span>

                <h3>
                    <a href="book.html?id=${book.id}">
                        ${book.title}
                    </a>
                </h3>

                <p>
                    ${book.author}
                </p>

                <div class="book-bottom">

                    <strong>
                        ${money(book.price)}
                    </strong>

                    <button
                        onclick="addToCart(${book.id})"
                    >
                        Add
                    </button>

                </div>

            </div>

        </article>
    `;
}


document.addEventListener(
    "DOMContentLoaded",
    updateCartCount
);