# TradeX — Online Trading Exchange Simulator

A full-stack stock exchange simulator that replicates core exchange workflows including user authentication, real-time order matching, portfolio management, and live price tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Matching Engine | C++ (STL) |
| Database | MongoDB |

---

## Architecture

```
Browser (HTML / CSS / JS)
        ↓  HTTP / REST API
Node.js + Express  (server.js)
        ↓  reads/writes
    MongoDB  ←──────────────────────┐
        ↓  syncs to txt files       │
  buy_orders.txt / sell_orders.txt  │
        ↓  spawns                   │
  C++ Binary  (matcher/main.cpp)    │
        ↓  runs matchOrders()       │
  Updates txt files ────────────────┘
  (synced back to MongoDB)
```

**Node.js** handles all HTTP, sessions, authentication, validation, price simulation, and MongoDB reads/writes.

**C++ binary** owns one job: load orders from text files, run the price-time priority matching engine, save updated balances/holdings/trades back to files. Node syncs those results to MongoDB after each run.

---

## Features

- **User Auth** — register with auto-assigned ID, login with ID + password, session management
- **Starter Portfolio** — new users receive free shares (TCS × 5, INFY × 10, WIPRO × 15)
- **Order Placement** — place buy/sell limit orders validated against live balance and holdings
- **C++ Matching Engine** — price-time priority matching, partial fills, automatic trade execution
- **Live Order Book** — shows all pending buy/sell orders across all users, updates after each trade
- **My Pending Orders** — shows only your unmatched orders, disappear once matched
- **Trade History** — full log of your executed trades with company, quantity, and price
- **Portfolio Overview** — live portfolio value and profit/loss vs starting balance
- **Price Charts** — live Chart.js line chart per stock with historical price data
- **Scrolling Ticker** — real-time price ticker bar showing all 10 stocks
- **Price Simulation** — server-side random walk (±0.4% every 3s) keeps prices moving

---

## Project Structure

```
Trade/
├── backend/
│   ├── server.js              # Express web server — HTTP, auth, MongoDB, price simulation
│   ├── matcher/
│   │   └── main.cpp           # C++ matching engine — price-time priority order matching
│   ├── package.json
│   └── node_modules/
├── frontend/
│   ├── dashboard.html         # Main trading dashboard
│   ├── index.html             # Landing page
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── app.js                 # Dashboard logic — charts, ticker, order placement
│   └── style.css
└── data/                      # Text files used as bridge between Node and C++
    ├── users.txt
    ├── holdings.txt
    ├── buy_orders.txt
    ├── sell_orders.txt
    └── trades.txt
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local, running on port 27017)
- A C++ compiler — `g++` (Linux/macOS/WSL) or MinGW (Windows)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/TradeX.git
cd TradeX
```

### 2. Install Node dependencies

```bash
cd backend
npm install
```

### 3. Compile the C++ matching engine

**Linux / macOS / WSL:**
```bash
cd backend/matcher
g++ -o main main.cpp
```

**Windows (MinGW):**
```bash
cd backend\matcher
g++ -o main.exe main.cpp
```

> If on Windows, update `MATCHER_BIN` in `server.js` to point to `main.exe`.

### 4. Start MongoDB

**Windows** — MongoDB runs as a service automatically after install. Verify:
```bash
mongosh
```

**Linux / WSL:**
```bash
sudo mkdir -p /data/db
sudo mongod --dbpath /data/db --fork --logpath /var/log/mongod.log
```

### 5. Create data folder

```bash
mkdir data
touch data/users.txt data/holdings.txt data/buy_orders.txt data/sell_orders.txt data/trades.txt
```

### 6. Start the server

```bash
cd backend
node server.js
```

Open your browser at: **http://localhost:5000**

---

## How It Works

### Matching Engine (C++)

The C++ binary (`matcher/main.cpp`) implements a **price-time priority** matching algorithm:

- **Buy orders** sorted: highest price first, then earliest timestamp
- **Sell orders** sorted: lowest price first, then earliest timestamp
- A trade executes when `buy.price >= sell.price` for the same stock
- Partial fills supported — remaining quantity stays in the order book
- On match: balances update, holdings update, trade is recorded

### Order Flow

```
User places order
    ↓
server.js validates (balance / holdings)
    ↓
Order saved to MongoDB (status: PENDING) + written to txt file
    ↓
server.js spawns C++ binary
    ↓
C++ loads all orders → runs matchOrders() → saves results to txt files
    ↓
server.js syncs txt file results back to MongoDB:
    - Updated balances  →  users collection
    - Updated holdings  →  holdings collection
    - New trades        →  trades collection
    - Remaining orders  →  orders collection (matched ones removed)
```

### MongoDB Collections

| Collection | Description |
|---|---|
| `users` | id, name, password, balance |
| `holdings` | userId, company, qty |
| `orders` | pending buy/sell orders |
| `trades` | executed trade history |
| `prices` | current price + history array per stock |

---

## .gitignore

Add this `.gitignore` to avoid committing unnecessary files:

```
node_modules/
data/*.txt
matcher/main
matcher/main.exe
```

---

## License

MIT
