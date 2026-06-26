const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: [
        "https://order-matching-engine-flame.vercel.app",
        "http://localhost:5000",
        "http://localhost:3000"
    ],
    credentials: true
}));
app.set("trust proxy", 1);

app.use(session({
    secret: "tradex-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    }
}));

app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= AUTH GUARD ================= */

function requireLogin(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.redirect("/login");
}

/* ================= MARKET STOCKS ================= */

const MARKET_STOCKS = {
    TCS: 3500,
    INFY: 1450,
    RELIANCE: 2800,
    APPLE: 7000,
    HDFC: 2100,
    WIPRO: 580,
    SBI: 590,
    MARUTI: 9200,
    BAJAJ: 4500,
    TITAN: 3200
};

const STOCK_NAMES = Object.keys(MARKET_STOCKS);
let priceHistory = {};

// ✅ Starter shares given to every newly registered user (company: quantity)
const STARTER_HOLDINGS = {
    TCS: 5,
    INFY: 10,
    WIPRO: 15
};

// Initialize price history for all stocks
for (const stock of STOCK_NAMES) {
    priceHistory[stock] = [
        { time: Date.now(), price: MARKET_STOCKS[stock] }
    ];
}

/* ================= DATA STORAGE ================= */

let users = [];
let buyOrders = [];
let sellOrders = [];
let holdings = {};

let nextUserId = 1000;
let nextOrderId = 1;

/* ================= FILE OPERATIONS ================= */

function loadUsers() {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, "../data/users.txt"),
            "utf-8"
        );
        data.split("\n").forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(" ");
            const user = {
                id: parseInt(parts[0]),
                name: parts[1],
                password: parts[2],
                balance: parseFloat(parts[3]) || 100000
            };
            users.push(user);
            nextUserId = Math.max(nextUserId, user.id + 1);
        });
    } catch (err) {
        console.log("No users file — starting fresh");
    }
}

function saveUsers() {
    const lines = users
        .map(u => `${u.id} ${u.name} ${u.password} ${u.balance}`)
        .join("\n");
    fs.writeFileSync(
        path.join(__dirname, "../data/users.txt"),
        lines + "\n"
    );
}

function loadHoldings() {
    holdings = {};
    try {
        const data = fs.readFileSync(
            path.join(__dirname, "../data/holdings.txt"),
            "utf-8"
        );
        data.split("\n").forEach(line => {
            if (!line.trim()) return;
            const [uid, company, qty] = line.split(" ");
            if (!holdings[uid]) holdings[uid] = {};
            holdings[uid][company] = parseInt(qty);
        });
    } catch (err) {}
}

function saveHoldings() {
    const lines = [];
    for (const uid in holdings) {
        for (const company in holdings[uid]) {
            if (holdings[uid][company] > 0)
                lines.push(`${uid} ${company} ${holdings[uid][company]}`);
        }
    }
    fs.writeFileSync(
        path.join(__dirname, "../data/holdings.txt"),
        lines.join("\n") + "\n"
    );
}

function loadTrades() {
    const trades = [];
    try {
        const data = fs.readFileSync(
            path.join(__dirname, "../data/trades.txt"),
            "utf-8"
        );
        data.split("\n").forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(" ");
            trades.push({
                buyerId: parseInt(parts[0]),
                sellerId: parseInt(parts[1]),
                company: parts[2],
                quantity: parseInt(parts[3]),
                price: parseFloat(parts[4]),
                timestamp: Date.now()
            });
        });
    } catch (err) {}
    return trades;
}

function saveTrade(trade) {
    const line = `${trade.buyerId} ${trade.sellerId} ${trade.company} ${trade.quantity} ${trade.price}\n`;
    fs.appendFileSync(
        path.join(__dirname, "../data/trades.txt"),
        line
    );
}

/* ================= UTILITY FUNCTIONS ================= */

function getUser(id) {
    return users.find(u => u.id === id) || null;
}

/* ================= PRICE SIMULATION ================= */
// Two sources move the price now:
// 1. Ambient drift below — small random wobble every 3s so the graph
//    never goes dead on untraded stocks.
// 2. updateMarketPrice() — called from executeTrade() whenever a real
//    trade fills, which snaps the price to whatever it actually traded at.
// Both write into the same MARKET_STOCKS / priceHistory, so a real trade
// always overrides the drift, but idle stocks still wobble in between.

function updateMarketPrice(company, price) {
    MARKET_STOCKS[company] = price;

    priceHistory[company].push({
        time: Date.now(),
        price: price
    });

    // Keep only last 100 entries
    if (priceHistory[company].length > 100) {
        priceHistory[company].shift();
    }
}

setInterval(() => {
    for (const stock of STOCK_NAMES) {
        // % based drift (~±0.4% per tick) so cheap stocks (WIPRO ₹580) and
        // expensive ones (MARUTI ₹9200) wobble by a similarly visible amount.
        const pctChange = (Math.random() * 0.8 - 0.4) / 100; // -0.4% .. +0.4%
        const drifted = Math.max(1, Math.round(MARKET_STOCKS[stock] * (1 + pctChange)));
        updateMarketPrice(stock, drifted);
    }
}, 3000);

/* ================= MATCHING ENGINE ================= */

function buyCompare(a, b) {
    if (a.price === b.price)
        return a.timestamp - b.timestamp;
    return b.price - a.price;
}

function sellCompare(a, b) {
    if (a.price === b.price)
        return a.timestamp - b.timestamp;
    return a.price - b.price;
}

function sortBooks() {
    buyOrders.sort(buyCompare);
    sellOrders.sort(sellCompare);
}

function executeTrade(buyOrder, sellOrder) {
    const qty = Math.min(buyOrder.quantity, sellOrder.quantity);
    const tradePrice = sellOrder.price;
    const total = qty * tradePrice;

    const buyer = getUser(buyOrder.userId);
    const seller = getUser(sellOrder.userId);

    if (!buyer || !seller || buyer.balance < total) {
        return false;
    }

    buyer.balance -= total;
    seller.balance += total;

    if (!holdings[buyOrder.userId]) holdings[buyOrder.userId] = {};
    if (!holdings[sellOrder.userId]) holdings[sellOrder.userId] = {};

    holdings[buyOrder.userId][buyOrder.company] =
        (holdings[buyOrder.userId][buyOrder.company] || 0) + qty;

    holdings[sellOrder.userId][sellOrder.company] =
        (holdings[sellOrder.userId][sellOrder.company] || 0) - qty;

    saveTrade({
        buyerId: buyer.id,
        sellerId: seller.id,
        company: buyOrder.company,
        quantity: qty,
        price: tradePrice
    });

    // 🔗 Trade executed at tradePrice — this becomes the new market price,
    // so the graph reflects real trading activity instead of drifting on its own.
    updateMarketPrice(buyOrder.company, tradePrice);

    buyOrder.quantity -= qty;
    sellOrder.quantity -= qty;

    return true;
}

function matchOrders() {
    sortBooks();

    let i = 0;
    while (i < buyOrders.length) {
        let j = 0;

        while (j < sellOrders.length) {
            const buyOrder = buyOrders[i];
            const sellOrder = sellOrders[j];

            if (buyOrder.company === sellOrder.company &&
                buyOrder.price >= sellOrder.price) {

                executeTrade(buyOrder, sellOrder);

                if (sellOrder.quantity === 0) {
                    sellOrders.splice(j, 1);
                } else {
                    j++;
                }

                if (buyOrder.quantity === 0) {
                    buyOrders.splice(i, 1);
                    i--;
                    break;
                }
            } else {
                j++;
            }
        }

        i++;
    }

    saveUsers();
    saveHoldings();
}

/* ================= PAGE ROUTES ================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/register.html"));
});

app.get("/dashboard", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

app.get("/profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/profile.html"));
});

/* ================= AUTH ROUTES ================= */

app.post("/register-user", (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.redirect("/register");

    const user = {
        id: nextUserId++,
        name,
        password,
        balance: 100000
    };

    users.push(user);
    saveUsers();

    // ✅ Grant starter shares to the new user
    holdings[user.id] = {};
    for (const company in STARTER_HOLDINGS) {
        if (MARKET_STOCKS[company]) {
            holdings[user.id][company] = STARTER_HOLDINGS[company];
        }
    }
    saveHoldings();

    console.log(`✅ User registered: ${user.id} ${user.name}`);
    console.log(`🎁 Starter shares granted to ${user.id}:`, holdings[user.id]);

    const starterRows = Object.entries(STARTER_HOLDINGS)
        .map(([company, qty]) => `
            <tr>
                <td style="padding:6px 16px;color:#e2e8f0">${company}</td>
                <td style="padding:6px 16px;color:#38bdf8">${qty} shares</td>
            </tr>
        `).join("");

    res.send(`
        <html><head><title>Registered</title><link rel="stylesheet" href="style.css"></head>
        <body class="auth-body"><div class="auth-container"><div class="auth-card">
        <h2 style="color:#22c55e">Registration Successful!</h2>
        <p style="color:#94a3b8;margin:20px 0">Your User ID: <strong style="color:#38bdf8;font-size:24px">${user.id}</strong></p>
        <p style="color:#94a3b8;margin-bottom:10px">Save this ID — you need it to login</p>
        <p style="color:#94a3b8;margin:20px 0 10px">🎁 Welcome bonus — free starter shares:</p>
        <table style="margin:0 auto 20px;border-collapse:collapse">${starterRows}</table>
        <a href="/login" class="btn primary-btn">Go To Login</a>
        </div></div></body></html>
    `);
});

app.post("/login-user", (req, res) => {
    const userId = parseInt(req.body.userid);
    const password = req.body.password;

    const foundUser = users.find(u => u.id === userId && u.password === password); // if found then founduser={id:1,name:"balu",password:"bacd"} else undefined

    if (foundUser) {
        req.session.userId = foundUser.id;  // object of express-session stores data about current user
        req.session.userName = foundUser.name; // use it bcz localvariable=founduser is gone after redirect
        console.log(`✅ User logged in: ${foundUser.id} ${foundUser.name}`);
        return res.redirect("/dashboard");
    }

    console.log(`❌ Login failed for ID: ${userId}`);
    res.send(`
        <html><head><title>Login Failed</title><link rel="stylesheet" href="style.css"></head>
        <body class="auth-body"><div class="auth-container"><div class="auth-card">
        <h2 style="color:#ef4444">Invalid Credentials</h2>
        <a href="/login" class="btn primary-btn" style="margin-top:20px;display:inline-block">Try Again</a>
        </div></div></body></html>
    `);
});

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

/* ================= API ROUTES ================= */

// ✅ GET /api/me - User profile
app.get("/api/me", requireLogin, (req, res) => {
    const user = getUser(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not found" });

    const myHoldings = holdings[user.id] || {};
    const allTrades = loadTrades();
    const myTrades = allTrades.filter(
        t => t.buyerId === user.id || t.sellerId === user.id
    );

    res.json({
        id: user.id,
        name: user.name,
        balance: user.balance,
        holdings: myHoldings,
        trades: myTrades
    });
});

// ✅ GET /api/stocks - All stock prices
app.get("/api/stocks", (req, res) => {
    res.json(MARKET_STOCKS);
});

// ✅ GET /api/stock-history/:stock - Price history for chart
app.get("/api/stock-history/:stock", (req, res) => {
    const stock = req.params.stock.toUpperCase();
    
    if (!priceHistory[stock]) {
        return res.status(404).json({ error: "Stock not found" });
    }
    
    res.json(priceHistory[stock]);
});

// ✅ GET /api/prices/:symbol - Alternative price endpoint
app.get("/api/prices/:symbol", (req, res) => {
    const sym = req.params.symbol.toUpperCase();
    const price = MARKET_STOCKS[sym];
    
    if (!price) {
        return res.status(404).json({ error: "Unknown symbol" });
    }
    
    res.json({ 
        symbol: sym, 
        price: price,
        history: priceHistory[sym] || []
    });
});

// ✅ GET /api/orders - Order book
app.get("/api/orders", requireLogin, (req, res) => {
    res.json({
        buyOrders: buyOrders.filter(o => o && o.quantity > 0),
        sellOrders: sellOrders.filter(o => o && o.quantity > 0)
    });
});

// ✅ GET /api/my-orders - User's pending orders
app.get("/api/my-orders", requireLogin, (req, res) => {
    const userId = req.session.userId;
    const myBuyOrders = buyOrders.filter(o => o.userId === userId && o.quantity > 0);
    const mySellOrders = sellOrders.filter(o => o.userId === userId && o.quantity > 0);
    
    res.json({
        buyOrders: myBuyOrders,
        sellOrders: mySellOrders
    });
});

// ✅ POST /api/order - Place order
app.post("/api/order", requireLogin, (req, res) => {
    const { type, company, quantity, price } = req.body;
    const userId = req.session.userId;

    if (!type || !company || !quantity || !price) {
        return res.status(400).json({ error: "Missing fields" });
    }

    if (!MARKET_STOCKS[company]) {
        return res.status(400).json({ error: "Unknown stock" });
    }

    const user = getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const qty = parseInt(quantity);
    const prc = parseFloat(price);

    // Validation
    if (type === "BUY") {
        const total = qty * prc;
        if (user.balance < total) {
            return res.status(400).json({ error: "Insufficient Balance" });
        }
    } else if (type === "SELL") {
        const held = (holdings[userId] && holdings[userId][company]) || 0;
        if (held < qty) {
            return res.status(400).json({ error: "Not Enough Shares" });
        }
    }

    // Create order
    const order = {
        orderId: nextOrderId++,
        userId,
        company,
        quantity: qty,
        price: prc,
        timestamp: Date.now(),
        type
    };

    console.log(`📋 Order placed: ${type} ${qty} ${company} @ ₹${prc}`);

    // Add to appropriate order book
    if (type === "BUY") {
        buyOrders.push(order);
    } else {
        sellOrders.push(order);
    }

    // Match orders
    matchOrders();

    res.json({ success: true, order });
});

// ✅ GET /api/profile - Profile statistics
app.get("/api/profile", requireLogin, (req, res) => {
    const user = getUser(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not found" });

    const myHoldings = holdings[user.id] || {};
    const allTrades = loadTrades();
    const myTrades = allTrades.filter(
        t => t.buyerId === user.id || t.sellerId === user.id
    );

    let portfolioValue = user.balance;
    for (const company in myHoldings) {
        const qty = myHoldings[company] || 0;
        portfolioValue += qty * MARKET_STOCKS[company];
    }

    res.json({
        id: user.id,
        name: user.name,
        balance: user.balance,
        portfolioValue: Math.round(portfolioValue),
        totalTrades: myTrades.length,
        totalPnl: Math.round(portfolioValue - 100000)
    });
});

/* ================= 404 - MUST BE LAST ================= */

app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    res.status(404).json({ error: "Endpoint not found" });
});

/* ================= START ================= */

loadUsers();
loadHoldings();

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║     TradeX Server Running 🚀       ║
╚════════════════════════════════════╝
URL: http://localhost:${PORT}
Users: ${users.length}
Stocks: ${STOCK_NAMES.length}


    `);
});
