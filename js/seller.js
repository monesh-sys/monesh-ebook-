/* =========================================
   MONESH EBOOKS SELLER SYSTEM
========================================= */

const COMMISSION_RATE = 0.10;


/* =========================================
   STORAGE
========================================= */

function getSellers() {
    return JSON.parse(
        localStorage.getItem("monesh_sellers") || "[]"
    );
}

function saveSellers(data) {
    localStorage.setItem(
        "monesh_sellers",
        JSON.stringify(data)
    );
}


function getBooks() {
    return JSON.parse(
        localStorage.getItem("monesh_seller_books") || "[]"
    );
}

function saveBooks(data) {
    localStorage.setItem(
        "monesh_seller_books",
        JSON.stringify(data)
    );
}


function getSales() {
    return JSON.parse(
        localStorage.getItem("monesh_sales") || "[]"
    );
}

function saveSales(data) {
    localStorage.setItem(
        "monesh_sales",
        JSON.stringify(data)
    );
}


/* =========================================
   CURRENT SELLER
========================================= */

function getCurrentSeller() {

    return JSON.parse(
        localStorage.getItem("monesh_current_seller") || "null"
    );

}


function setCurrentSeller(seller) {

    localStorage.setItem(
        "monesh_current_seller",
        JSON.stringify(seller)
    );

}


function sellerLogout() {

    localStorage.removeItem(
        "monesh_current_seller"
    );

    window.location.href =
        "seller-login.html";

}


/* =========================================
   REGISTER
========================================= */

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        function(e) {

            e.preventDefault();

            const name =
                document.getElementById("sellerName")
                .value.trim();

            const email =
                document.getElementById("sellerEmail")
                .value.trim()
                .toLowerCase();

            const phone =
                document.getElementById("sellerPhone")
                .value.trim();

            const password =
                document.getElementById("sellerPassword")
                .value;

            const sellers = getSellers();

            const exists =
                sellers.some(
                    seller =>
                        seller.email === email
                );

            if (exists) {

                showMessage(
                    "registerMessage",
                    "Email already registered.",
                    "error"
                );

                return;
            }


            const seller = {

                id:
                    "SELLER-" +
                    Date.now(),

                name,

                email,

                phone,

                password,

                createdAt:
                    new Date().toISOString()

            };


            sellers.push(seller);

            saveSellers(sellers);

            setCurrentSeller(seller);


            showMessage(
                "registerMessage",
                "Account created successfully!",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "seller-dashboard.html";

            }, 800);

        }
    );

}


/* =========================================
   LOGIN
========================================= */

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function(e) {

            e.preventDefault();

            const email =
                document.getElementById("loginEmail")
                .value.trim()
                .toLowerCase();

            const password =
                document.getElementById("loginPassword")
                .value;

            const sellers = getSellers();

            const seller =
                sellers.find(
                    s =>
                        s.email === email &&
                        s.password === password
                );


            if (!seller) {

                showMessage(
                    "loginMessage",
                    "Invalid email or password.",
                    "error"
                );

                return;
            }


            setCurrentSeller(seller);


            showMessage(
                "loginMessage",
                "Login successful!",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "seller-dashboard.html";

            }, 600);

        }
    );

}


/* =========================================
   PAGE PROTECTION
========================================= */

function requireSeller() {

    const seller =
        getCurrentSeller();

    if (!seller) {

        window.location.href =
            "seller-login.html";

        return null;
    }

    return seller;

}


/* =========================================
   DASHBOARD
========================================= */

if (
    document.getElementById("bookCount")
) {

    const seller =
        requireSeller();

    if (seller) {

        const books =
            getBooks().filter(
                b =>
                    b.sellerId === seller.id
            );

        const sales =
            getSales().filter(
                s =>
                    s.sellerId === seller.id
            );


        const earnings =
            sales.reduce(
                (total, sale) =>
                    total + Number(sale.sellerAmount),
                0
            );


        const pending =
            books.filter(
                b =>
                    b.status === "pending"
            ).length;


        document.getElementById(
            "welcomeSeller"
        ).textContent =
            `Welcome back, ${seller.name}!`;


        document.getElementById(
            "bookCount"
        ).textContent =
            books.length;


        document.getElementById(
            "saleCount"
        ).textContent =
            sales.length;


        document.getElementById(
            "totalEarnings"
        ).textContent =
            formatMoney(earnings);


        document.getElementById(
            "pendingBooks"
        ).textContent =
            pending;

    }

}


/* =========================================
   UPLOAD BOOK
========================================= */

const uploadForm =
    document.getElementById(
        "uploadBookForm"
    );


if (uploadForm) {

    requireSeller();


    const priceInput =
        document.getElementById(
            "bookPrice"
        );


    priceInput.addEventListener(
        "input",
        updateCommission
    );


    uploadForm.addEventListener(
        "submit",
        function(e) {

            e.preventDefault();


            const seller =
                requireSeller();

            if (!seller) return;


            const title =
                document.getElementById(
                    "bookTitle"
                ).value.trim();


            const author =
                document.getElementById(
                    "bookAuthor"
                ).value.trim();


            const category =
                document.getElementById(
                    "bookCategory"
                ).value;


            const description =
                document.getElementById(
                    "bookDescription"
                ).value.trim();


            const price =
                Number(
                    document.getElementById(
                        "bookPrice"
                    ).value
                );


            const pdf =
                document.getElementById(
                    "bookPdf"
                ).files[0];


            if (!pdf) {

                showMessage(
                    "uploadMessage",
                    "Please select a PDF.",
                    "error"
                );

                return;
            }


            if (
                !pdf.name
                    .toLowerCase()
                    .endsWith(".pdf")
            ) {

                showMessage(
                    "uploadMessage",
                    "Only PDF files are allowed.",
                    "error"
                );

                return;
            }


            const book = {

                id:
                    "BOOK-" +
                    Date.now(),

                sellerId:
                    seller.id,

                sellerName:
                    seller.name,

                title,

                author,

                category,

                description,

                price,

                pdfName:
                    pdf.name,

                status:
                    "pending",

                createdAt:
                    new Date().toISOString()

            };


            const books =
                getBooks();


            books.push(book);

            saveBooks(books);


            showMessage(
                "uploadMessage",
                "Book submitted for admin approval!",
                "success"
            );


            uploadForm.reset();

            updateCommission();


            setTimeout(() => {

                window.location.href =
                    "seller-books.html";

            }, 1000);

        }
    );

}


/* =========================================
   COMMISSION
========================================= */

function updateCommission() {

    const priceElement =
        document.getElementById(
            "bookPrice"
        );

    const output =
        document.getElementById(
            "sellerAmount"
        );

    if (!priceElement || !output)
        return;


    const price =
        Number(priceElement.value) || 0;


    const sellerAmount =
        price -
        price * COMMISSION_RATE;


    output.textContent =
        formatMoney(sellerAmount);

}


/* =========================================
   SELLER BOOKS
========================================= */

const sellerBooksTable =
    document.getElementById(
        "sellerBooksTable"
    );


if (sellerBooksTable) {

    const seller =
        requireSeller();

    if (seller) {

        const books =
            getBooks().filter(
                b =>
                    b.sellerId === seller.id
            );


        if (!books.length) {

            sellerBooksTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        No books uploaded yet.
                    </td>
                </tr>
            `;

        } else {

            sellerBooksTable.innerHTML =
                books.map(book => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(book.title)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(book.category)}
                    </td>

                    <td>
                        ${formatMoney(book.price)}
                    </td>

                    <td>
                        ${statusBadge(book.status)}
                    </td>

                </tr>

            `).join("");

        }

    }

}


/* =========================================
   SELLER SALES
========================================= */

const salesTable =
    document.getElementById(
        "salesTable"
    );


if (salesTable) {

    const seller =
        requireSeller();

    if (seller) {

        const sales =
            getSales().filter(
                s =>
                    s.sellerId === seller.id
            );


        if (!sales.length) {

            salesTable.innerHTML = `
                <tr>
                    <td colspan="5">
                        No sales yet.
                    </td>
                </tr>
            `;

        } else {

            salesTable.innerHTML =
                sales.map(sale => `

                <tr>

                    <td>
                        ${escapeHTML(sale.bookTitle)}
                    </td>

                    <td>
                        ${formatMoney(sale.amount)}
                    </td>

                    <td>
                        ${formatMoney(sale.commission)}
                    </td>

                    <td>
                        ${formatMoney(sale.sellerAmount)}
                    </td>

                    <td>
                        ${formatDate(sale.date)}
                    </td>

                </tr>

            `).join("");

        }

    }

}


/* =========================================
   EARNINGS
========================================= */

if (
    document.getElementById(
        "earningTotal"
    )
) {

    const seller =
        requireSeller();

    if (seller) {

        const sales =
            getSales().filter(
                s =>
                    s.sellerId === seller.id
            );


        const total =
            sales.reduce(
                (x, s) =>
                    x + Number(s.sellerAmount),
                0
            );


        document.getElementById(
            "earningTotal"
        ).textContent =
            formatMoney(total);


        document.getElementById(
            "earningPending"
        ).textContent =
            formatMoney(total);


        document.getElementById(
            "earningPaid"
        ).textContent =
            "₹0";

    }

}


/* =========================================
   ADMIN
========================================= */

const adminBooksTable =
    document.getElementById(
        "adminBooksTable"
    );


if (adminBooksTable) {

    renderAdmin();

}


function renderAdmin() {

    const sellers =
        getSellers();

    const books =
        getBooks();


    document.getElementById(
        "adminSellerCount"
    ).textContent =
        sellers.length;


    document.getElementById(
        "adminBookCount"
    ).textContent =
        books.length;


    document.getElementById(
        "adminPendingCount"
    ).textContent =
        books.filter(
            b =>
                b.status === "pending"
        ).length;


    if (!books.length) {

        adminBooksTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No books available.
                </td>
            </tr>
        `;

        return;
    }


    adminBooksTable.innerHTML =
        books.map(book => `

        <tr>

            <td>
                ${escapeHTML(book.title)}
            </td>

            <td>
                ${escapeHTML(book.sellerName)}
            </td>

            <td>
                ${formatMoney(book.price)}
            </td>

            <td>
                ${statusBadge(book.status)}
            </td>

            <td>

                ${
                    book.status === "pending"

                    ?

                    `
                    <button
                        class="action-btn"
                        onclick="approveBook('${book.id}')"
                    >
                        Approve
                    </button>

                    <button
                        class="action-btn reject"
                        onclick="rejectBook('${book.id}')"
                    >
                        Reject
                    </button>
                    `

                    :

                    "-"
                }

            </td>

        </tr>

    `).join("");

}


/* =========================================
   APPROVE
========================================= */

function approveBook(id) {

    const books =
        getBooks();


    const book =
        books.find(
            b =>
                b.id === id
        );


    if (!book)
        return;


    book.status =
        "approved";


    saveBooks(books);

    renderAdmin();

}


/* =========================================
   REJECT
========================================= */

function rejectBook(id) {

    const books =
        getBooks();


    const book =
        books.find(
            b =>
                b.id === id
        );


    if (!book)
        return;


    book.status =
        "rejected";


    saveBooks(books);

    renderAdmin();

}


/* =========================================
   HELPERS
========================================= */

function formatMoney(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN", {
                maximumFractionDigits: 2
            });

}


function formatDate(date) {

    return new Date(date)
        .toLocaleDateString("en-IN");

}


function statusBadge(status) {

    const text =
        status.charAt(0).toUpperCase() +
        status.slice(1);


    return `
        <span class="status ${status}">
            ${text}
        </span>
    `;

}


function showMessage(
    id,
    message,
    type
) {

    const element =
        document.getElementById(id);

    if (!element)
        return;


    element.textContent =
        message;


    element.style.color =
        type === "success"
            ? "#4ade80"
            : "#f87171";

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
