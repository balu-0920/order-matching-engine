/* ================= GLOBAL VARIABLES ================= */

let marketPrices = {};
let priceChart = null;
let currentStock = "TCS";

/* ================= DOM ELEMENTS ================= */

const companySelect   = document.getElementById("company-select");
const quantityInput   = document.getElementById("quantity-input");
const priceInput      = document.getElementById("price-input");
const buyBtn          = document.getElementById("buy-btn");
const sellBtn         = document.getElementById("sell-btn");
const balanceEl       = document.getElementById("balance-display");
const welcomeEl       = document.getElementById("welcome-text");
const holdingsEl      = document.getElementById("holdings-container");
const tradeHistoryEl  = document.getElementById("trade-history-container");
const buyOrdersBody   = document.getElementById("buy-orders-body");
const sellOrdersBody  = document.getElementById("sell-orders-body");
const orderStatusEl   = document.getElementById("order-status");
const tickerEl        = document.getElementById("price-ticker");
const chartCanvas     = document.getElementById("priceChart");
const chartStockLabel = document.getElementById("chart-stock");

/* ================= HELPERS ================= */

function setStatus(msg, isError) {
    if (!orderStatusEl) return;
    orderStatusEl.textContent = msg;
    orderStatusEl.style.color = isError ? "#ef4444" : "#22c55e";
}

function showNotification(msg, type = "success") {
    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.innerHTML = `
        <div class="notification-content">
            <span>${msg}</span>
        </div>
    `;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add("show");
    }, 10);
    
    setTimeout(() => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function formatCurrency(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
}

function formatNumber(n) {
    return Number(n).toLocaleString("en-IN");
}

/* ================= LOAD STOCKS ================= */

async function loadStocks() {
    try {
        const res = await fetch("/api/stocks");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const stocks = await res.json();
        marketPrices = { ...stocks };
        
        console.log("✅ Stocks loaded:", Object.keys(stocks).length);
        updateTicker();
        updateMarketPriceDisplay();
        
    } catch (err) {
        console.error("❌ Failed to load stocks:", err);
        showNotification("Failed to load stock prices", "error");
    }
}

/* ================= PRICE TICKER ================= */

function updateTicker() {
    if (!tickerEl) return;
    
    let html = '<div class="ticker-scroll">';
    for (const [stock, price] of Object.entries(marketPrices)) {
        html += `<div class="ticker-item">
            <span class="ticker-stock">${stock}</span>
            <span class="ticker-price">${formatCurrency(price)}</span>
        </div>`;
    }
    html += '</div>';
    tickerEl.innerHTML = html;
}

function updateMarketPriceDisplay() {
    if (!priceInput) return;
    priceInput.value = marketPrices[currentStock] || 0;
}

/* ================= PRICE CHART ================= */

async function loadPriceHistory() {
    try {
        console.log(`📊 Loading price history for ${currentStock}...`);
        
        const res = await fetch(`/api/stock-history/${currentStock}`);
        
        if (!res.ok) {
            console.warn(`⚠️ API returned ${res.status}, using mock data`);
            // Use mock data if API doesn't support it yet
            const mockData = generateMockPriceHistory();
            renderChart(mockData);
            return;
        }
        
        const history = await res.json();
        console.log(`✅ Got ${history.length} price points`);
        
        renderChart(history);
        
    } catch (err) {
        console.error("❌ Failed to load price history:", err);
        // Fallback: Generate mock data
        const mockData = generateMockPriceHistory();
        renderChart(mockData);
    }
}

function generateMockPriceHistory() {
    // Generate mock price data for demo
    const data = [];
    const basePrice = marketPrices[currentStock] || 3500;
    const now = Date.now();
    
    for (let i = 50; i >= 0; i--) {
        const variation = (Math.random() - 0.5) * 100;
        data.push({
            time: now - (i * 60000),  // 1 min intervals
            price: Math.max(basePrice + variation, 100)
        });
    }
    return data;
}

function renderChart(history) {
    if (!chartCanvas) {
        console.warn("⚠️ Canvas element not found");
        return;
    }

    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        console.error("❌ Chart.js not loaded!");
        chartCanvas.parentElement.innerHTML = '<p style="color: red;">Chart.js not loaded</p>';
        return;
    }

    const labels = history.map(h => {
        const date = new Date(h.time);
        return date.toLocaleTimeString();
    });
    
    const data = history.map(h => h.price);
    
    // Destroy old chart if exists
    if (priceChart) {
        priceChart.destroy();
    }
    
    try {
        priceChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${currentStock} Price (₹)`,
                    data: data,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2,
                    pointBackgroundColor: '#38bdf8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        display: true, 
                        labels: { color: '#cbd5e1', font: { size: 12 } }
                    }
                },
                scales: {
                    y: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(51, 65, 85, 0.3)' }
                    },
                    x: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(51, 65, 85, 0.3)' }
                    }
                }
            }
        });
        
        console.log("✅ Chart rendered successfully");
        
    } catch (err) {
        console.error("❌ Error rendering chart:", err);
    }
}

/* ================= SET COMPANY CHANGE ================= */

if (companySelect) {
    companySelect.addEventListener("change", () => {
        currentStock = companySelect.value;
        if (chartStockLabel) chartStockLabel.textContent = currentStock;
        updateMarketPriceDisplay();
        loadPriceHistory();
    });
}

/* ================= LOAD USER DATA ================= */

async function loadUserData() {
    try {
        console.log("👤 Loading user data...");
        
        const res = await fetch("/api/me");

        if (res.status === 401 || res.redirected) {
            console.log("⚠️ Not authenticated, redirecting...");
            window.location.href = "/login";
            return;
        }

        const data = await res.json();
        console.log("✅ User data loaded:", data);

        if (welcomeEl) welcomeEl.textContent = `Welcome, ${data.name}`;
        if (balanceEl) balanceEl.textContent = formatCurrency(data.balance);

        renderHoldings(data.holdings);
        renderTradeHistory(data.trades, data.id);
        calculatePortfolioValue(data.holdings, data.balance);

    } catch (err) {
        console.error("❌ Failed to load user data:", err);
        showNotification("Failed to load profile", "error");
    }
}

/* ================= RENDER HOLDINGS ================= */

function renderHoldings(holdings) {
    if (!holdingsEl) return;

    const entries = Object.entries(holdings).filter(([, qty]) => qty > 0);

    if (entries.length === 0) {
        holdingsEl.innerHTML = `<p style="color:var(--muted-text)">No holdings yet</p>`;
        return;
    }

    holdingsEl.innerHTML = entries.map(([company, qty]) => {
        const currentPrice = marketPrices[company] || 0;
        const value = qty * currentPrice;
        
        return `
            <div class="holding-item">
                <div class="holding-left">
                    <span class="holding-company">${company}</span>
                    <span class="holding-qty">${qty} Shares</span>
                </div>
                <div class="holding-right">
                    <span class="holding-value">${formatCurrency(value)}</span>
                    <span class="holding-price">${formatCurrency(currentPrice)}/unit</span>
                </div>
            </div>
        `;
    }).join("");
}

/* ================= PORTFOLIO P&L ================= */

function calculatePortfolioValue(holdings, balance) {
    let portfolioValue = balance;

    for (const [company, qty] of Object.entries(holdings)) {
        if (qty > 0) {
            portfolioValue += qty * marketPrices[company];
        }
    }

    const profitLoss = portfolioValue - 100000;
    const profitLossPercent = ((profitLoss / 100000) * 100).toFixed(2);
    
    const plElement = document.getElementById("portfolio-pl");
    if (plElement) {
        const color = profitLoss >= 0 ? "#22c55e" : "#ef4444";
        const sign = profitLoss >= 0 ? "+" : "";
        plElement.innerHTML = `
            <div class="pl-stat">
                <span>Portfolio Value</span>
                <span style="color:#38bdf8;font-size:20px">${formatCurrency(portfolioValue)}</span>
            </div>
            <div class="pl-stat">
                <span>Profit/Loss</span>
                <span style="color:${color};font-size:20px">${sign}${formatCurrency(profitLoss)} (${sign}${profitLossPercent}%)</span>
            </div>
        `;
    }
}

/* ================= RENDER TRADE HISTORY ================= */

function renderTradeHistory(trades, myId) {
    if (!tradeHistoryEl) return;

    if (!trades || trades.length === 0) {
        tradeHistoryEl.innerHTML = `<p style="color:var(--muted-text)">No trades yet</p>`;
        return;
    }

    const reversed = [...trades].reverse().slice(0, 10);  // Last 10 trades

    const tableHTML = `
        <table class="trade-table" style="width: 100%; font-size: 11px;">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Stock</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${reversed.map(t => {
                    const isBuy = t.buyerId === myId;
                    const type = isBuy ? "BUY" : "SELL";
                    const total = t.quantity * t.price;
                    
                    return `<tr class="${isBuy ? 'buy-row' : 'sell-row'}">
                        <td><span class="badge ${isBuy ? 'badge-buy' : 'badge-sell'}">${type}</span></td>
                        <td>${t.company}</td>
                        <td>${t.quantity}</td>
                        <td>${formatCurrency(t.price)}</td>
                        <td>${formatCurrency(total)}</td>
                    </tr>`;
                }).join("")}
            </tbody>
        </table>
    `;

    tradeHistoryEl.innerHTML = tableHTML;
}

/* ================= LOAD ORDER BOOK ================= */

async function loadOrderBook() {
    try {
        const res = await fetch("/api/orders");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();

        renderOrderBook(buyOrdersBody, data.buyOrders, "buy");
        renderOrderBook(sellOrdersBody, data.sellOrders, "sell");

    } catch (err) {
        console.error("❌ Failed to load order book:", err);
    }
}

function renderOrderBook(tbody, orders, type) {
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--muted-text);padding:10px 0">No orders</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${o.company}</td>
            <td>${o.quantity}</td>
            <td>${formatCurrency(o.price)}</td>
        </tr>
    `).join("");
}

/* ================= PLACE ORDER ================= */

async function placeOrder(type) {
    const company = companySelect.value;
    const quantity = parseInt(quantityInput.value);
    const price = parseFloat(priceInput.value);

    if (!quantity || quantity <= 0 || !price || price <= 0) {
        setStatus("Please enter valid quantity and price", true);
        return;
    }

    buyBtn.disabled = true;
    sellBtn.disabled = true;
    setStatus("Placing order...", false);

    try {
        const res = await fetch("/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, company, quantity, price })
        });

        const data = await res.json();

        if (!res.ok) {
            setStatus(data.error || "Order failed", true);
            showNotification(data.error || "Order failed", "error");
            return;
        }

        showNotification(`✅ ${type} order placed for ${quantity} ${company} @ ${formatCurrency(price)}`, "success");
        setStatus(`Order placed successfully!`, false);

        await loadUserData();
        await loadOrderBook();

        quantityInput.value = "";
        priceInput.value = marketPrices[company];

    } catch (err) {
        console.error("Error:", err);
        setStatus("Server error — try again", true);
        showNotification("Server error", "error");
    } finally {
        buyBtn.disabled = false;
        sellBtn.disabled = false;
    }
}

/* ================= BUTTON LISTENERS ================= */

if (buyBtn) buyBtn.addEventListener("click", () => placeOrder("BUY"));
if (sellBtn) sellBtn.addEventListener("click", () => placeOrder("SELL"));

/* ================= AUTO-REFRESH ================= */

setInterval(() => {
    loadStocks();
    loadOrderBook();
    loadUserData();
}, 5000);

/* ================= INIT ================= */

console.log("🚀 TradeX Dashboard Initializing...");

// Check if Chart.js is loaded
if (typeof Chart === 'undefined') {
    console.error("❌ ERROR: Chart.js library not loaded!");
    console.log("Make sure <script src='https://cdn.jsdelivr.net/npm/chart.js'></script> is in HTML");
} else {
    console.log("✅ Chart.js loaded successfully");
}

if (document.getElementById("balance-display")) {
    loadStocks();
    loadUserData();
    loadOrderBook();
    loadPriceHistory();
    
    console.log("✅ Dashboard initialized");
} else {
    console.warn("⚠️ Dashboard elements not found");
}
