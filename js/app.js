/* =========================================================
   MONESH EBOOKS - MAIN APP
   Supports:
   - Normal books
   - Approved seller books
   - String and numeric IDs
   - Cart
   ========================================================= */


/* =========================================================
   SELLER BOOKS
   ========================================================= */

function getApprovedSellerBooks() {

    try {

        const sellerBooks = JSON.parse(
            localStorage.getItem("monesh_seller_books") || "[]"
        );

        if (!Array.isArray(sellerBooks)) {
            return [];
        }

        return sellerBooks
            .filter(book => book.status === "approved")
            .map(book => {

                return {

                    id: String(book.id),

                    title: book.title,

                    author: book.author || "Unknown Author",

                    category: book.category || "Ebook",

                    price: Number(book.price) || 0,

                    rating: book.rating || "New",

                    description:
                        book.description ||
                        "No description available.",

                    cover:
                        book.cover ||
                        "assets/programming.jpg",

                    pdf:
                        book.pdf || null,

                    pdfName:
                        book.pdfName || null,

                    pages:
                        book.pages || "Digital",

                    sellerId:
                        book.sellerId || null,

                    sellerName:
                        book.sellerName || null,

                    status:
                        book.status,

                    createdAt:
                        book.createdAt || null

                };

            });

    } catch (error) {

        console.error(
            "Error loading seller books:",
            error
        );

        return [];

    }

}


/* =========================================================
   ALL BOOKS
   ========================================================= */

function getAllBooks() {

    const normalBooks =
        typeof books !== "undefined" &&
        Array.isArray(books)
            ? books
            : [];


    const sellerBooks =
        getApprovedSellerBooks();


    return [
        ...normalBooks,
        ...sellerBooks
    ];

}


/* =========================================================
   GET SINGLE BOOK
   ========================================================= */

function getBook(id) {

    const allBooks =
        getAllBooks();


    const requestedId =
        String(id);


    return allBooks.find(
        book =>
            String(book.id) === requestedId
    );

}


/* =========================================================
   CART
   ========================================================= */

function getCart() {

    try {

        const cart =
            JSON.parse(
                localStorage.getItem("cart") || "[]"
            );

        return Array.isArray(cart)
            ? cart.map(String)
            : [];

    } catch (error) {

        return [];

    }

}


function saveCart(cart) {

    localStorage.setItem(
        "cart",
        JSON.stringify(
            cart.map(String)
        )
    );

}


/* =========================================================
   ADD TO CART
   ========================================================= */

function addToCart(id) {

    const cart =
        getCart();


    const bookId =
        String(id);


    if (!cart.includes(bookId)) {

        cart.push(bookId);

        saveCart(cart);

        alert("Book added to cart!");

    } else {

        alert("This book is already in your cart.");

    }


    updateCartCount();

}


/* =========================================================
   REMOVE FROM CART
   ========================================================= */

function removeFromCart(id) {

    const bookId =
        String(id);


    let cart =
        getCart();


    cart =
        cart.filter(
            item =>
                String(item) !== bookId
        );


    saveCart(cart);


    location.reload();

}


/* =========================================================
   CART COUNT
   ========================================================= */

function updateCartCount() {

    const cart =
        getCart();


    const elements =
        document.querySelectorAll(
            ".cart-count"
        );


    elements.forEach(element => {

        element.textContent =
            cart.length;

    });

}


/* =========================================================
   MONEY FORMAT
   ========================================================= */

function money(amount) {

    return "₹" + Number(amount || 0);

}


/* =========================================================
   CREATE BOOK CARD
   ========================================================= */

function createBookCard(book) {

    const id =
        String(book.id);


    const safeId =
        encodeURIComponent(id);


    const safeTitle =
        String(book.title || "Untitled");


    const safeAuthor =
        String(book.author || "Unknown Author");


    const safeCategory =
        String(book.category || "Ebook");


    const safeCover =
        book.cover ||
        "assets/programming.jpg";


    return `

        <article class="book-card">

            <a
                href="book.html?id=${safeId}"
            >

                <img
                    src="${safeCover}"
                    alt="${safeTitle}"
                    onerror="this.src='assets/programming.jpg'"
                >

            </a>


            <div class="book-info">

                <span class="category">
                    ${safeCategory}
                </span>


                <h3>

                    <a
                        href="book.html?id=${safeId}"
                    >
                        ${safeTitle}
                    </a>

                </h3>


                <p>
                    ${safeAuthor}
                </p>


                <div class="book-bottom">

                    <strong>
                        ${money(book.price)}
                    </strong>


                    <button
                        onclick='addToCart(${JSON.stringify(id)})'
                    >
                        Add
                    </button>

                </div>

            </div>

        </article>

    `;

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateCartCount();

    }
);
