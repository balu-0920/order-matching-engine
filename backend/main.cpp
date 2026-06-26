#include <bits/stdc++.h>
using namespace std;

/* ================= STRUCTURES ================= */

struct User {
    int id;
    string name;
    string password;
    double balance;
};

struct Order {
    int orderId;
    int userId;
    string company;
    int quantity;
    double price;
    string type;
    long long timestamp;
};

struct Trade {
    int buyerId;
    int sellerId;
    string company;
    int quantity;
    double price;
};

/* ================= GLOBAL DATA ================= */

vector<User> users;
vector<Order> buyOrders;
vector<Order> sellOrders;
map<int, map<string, int>> holdings;
vector<Trade> trades;

/* ================= JSON PARSING (Simple) ================= */

string trim(const string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

/* ================= FILE OPERATIONS ================= */

void loadUsers() {
    ifstream file("data/users.txt");
    if (!file.is_open()) return;
    
    User u;
    while (file >> u.id >> u.name >> u.password >> u.balance) {
        users.push_back(u);
    }
    file.close();
}

void loadHoldings() {
    ifstream file("data/holdings.txt");
    if (!file.is_open()) return;
    
    int uid, qty;
    string company;
    
    while (file >> uid >> company >> qty) {
        holdings[uid][company] = qty;
    }
    file.close();
}

void loadOrders() {
    ifstream buyFile("data/buy_orders.txt");
    if (buyFile.is_open()) {
        Order o;
        while (buyFile >> o.orderId >> o.userId >> o.company >> o.quantity >> o.price >> o.timestamp) {
            o.type = "BUY";
            buyOrders.push_back(o);
        }
        buyFile.close();
    }
    
    ifstream sellFile("data/sell_orders.txt");
    if (sellFile.is_open()) {
        Order o;
        while (sellFile >> o.orderId >> o.userId >> o.company >> o.quantity >> o.price >> o.timestamp) {
            o.type = "SELL";
            sellOrders.push_back(o);
        }
        sellFile.close();
    }
}

void saveUsers() {
    ofstream file("data/users.txt");
    for (auto& u : users) {
        file << u.id << " " << u.name << " " << u.password << " " << u.balance << endl;
    }
    file.close();
}

void saveHoldings() {
    ofstream file("data/holdings.txt");
    for (auto& u : holdings) {
        for (auto& s : u.second) {
            if (s.second > 0)
                file << u.first << " " << s.first << " " << s.second << endl;
        }
    }
    file.close();
}

void saveTrades() {
    ofstream file("data/trades.txt", ios::app);
    for (auto& t : trades) {
        file << t.buyerId << " " << t.sellerId << " " << t.company << " "
             << t.quantity << " " << t.price << endl;
    }
    file.close();
}

void saveOrders() {
    ofstream buyFile("data/buy_orders.txt");
    for (auto& o : buyOrders) {
        buyFile << o.orderId << " " << o.userId << " " << o.company << " "
                << o.quantity << " " << o.price << " " << o.timestamp << endl;
    }
    buyFile.close();
    
    ofstream sellFile("data/sell_orders.txt");
    for (auto& o : sellOrders) {
        sellFile << o.orderId << " " << o.userId << " " << o.company << " "
                 << o.quantity << " " << o.price << " " << o.timestamp << endl;
    }
    sellFile.close();
}

/* ================= UTILITY FUNCTIONS ================= */

User* getUser(int id) {
    for (auto& u : users) {
        if (u.id == id) return &u;
    }
    return nullptr;
}

string orderToJson(const Order& o) {
    stringstream ss;
    ss << "{\"orderId\":" << o.orderId << ",\"userId\":" << o.userId
       << ",\"company\":\"" << o.company << "\",\"quantity\":" << o.quantity
       << ",\"price\":" << fixed << setprecision(2) << o.price
       << ",\"type\":\"" << o.type << "\",\"timestamp\":" << o.timestamp << "}";
    return ss.str();
}

string tradeToJson(const Trade& t) {
    stringstream ss;
    ss << "{\"buyerId\":" << t.buyerId << ",\"sellerId\":" << t.sellerId
       << ",\"company\":\"" << t.company << "\",\"quantity\":" << t.quantity
       << ",\"price\":" << fixed << setprecision(2) << t.price << "}";
    return ss.str();
}

/* ================= SORTING (from main.cpp) ================= */

bool buyCompare(const Order& a, const Order& b) {
    if (a.price == b.price)
        return a.timestamp < b.timestamp;
    return a.price > b.price;
}

bool sellCompare(const Order& a, const Order& b) {
    if (a.price == b.price)
        return a.timestamp < b.timestamp;
    return a.price < b.price;
}

void sortBooks() {
    sort(buyOrders.begin(), buyOrders.end(), buyCompare);
    sort(sellOrders.begin(), sellOrders.end(), sellCompare);
}

/* ================= MATCHING ENGINE (from main.cpp) ================= */

void executeTrade(Order& buy, Order& sell) {
    int qty = min(buy.quantity, sell.quantity);
    double tradePrice = sell.price;
    double total = qty * tradePrice;

    User* buyer = getUser(buy.userId);
    User* seller = getUser(sell.userId);

    if (!buyer || !seller || buyer->balance < total) {
        return;  // Trade cannot execute
    }

    buyer->balance -= total;
    seller->balance += total;

    holdings[buyer->id][buy.company] += qty;
    holdings[seller->id][sell.company] -= qty;

    Trade t;
    t.buyerId = buyer->id;
    t.sellerId = seller->id;
    t.company = buy.company;
    t.quantity = qty;
    t.price = tradePrice;

    trades.push_back(t);

    buy.quantity -= qty;
    sell.quantity -= qty;

    cerr << "Trade executed: " << qty << " " << buy.company << " @ " << tradePrice << endl;
}

void matchOrders() {
    sortBooks();

    int i = 0;
    while (i < (int)buyOrders.size()) {
        bool matched = false;
        int j = 0;

        while (j < (int)sellOrders.size()) {
            if (buyOrders[i].company == sellOrders[j].company &&
                buyOrders[i].price >= sellOrders[j].price) {

                executeTrade(buyOrders[i], sellOrders[j]);
                matched = true;

                if (sellOrders[j].quantity == 0) {
                    sellOrders.erase(sellOrders.begin() + j);
                } else {
                    j++;
                }

                if (buyOrders[i].quantity == 0) {
                    buyOrders.erase(buyOrders.begin() + i);
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
    saveTrades();
    saveOrders();
}

/* ================= MAIN EXECUTION ================= */

int main(int argc, char* argv[]) {
    // Load all data
    loadUsers();
    loadHoldings();
    loadOrders();

    // Run matching engine
    matchOrders();

    // Output results as JSON
    cout << "{" << endl;
    cout << "  \"success\": true," << endl;
    cout << "  \"trades\": [" << endl;
    
    for (int i = 0; i < (int)trades.size(); i++) {
        cout << "    " << tradeToJson(trades[i]);
        if (i < (int)trades.size() - 1) cout << ",";
        cout << endl;
    }
    
    cout << "  ]," << endl;
    cout << "  \"buyOrders\": [" << endl;
    
    for (int i = 0; i < (int)buyOrders.size(); i++) {
        cout << "    " << orderToJson(buyOrders[i]);
        if (i < (int)buyOrders.size() - 1) cout << ",";
        cout << endl;
    }
    
    cout << "  ]," << endl;
    cout << "  \"sellOrders\": [" << endl;
    
    for (int i = 0; i < (int)sellOrders.size(); i++) {
        cout << "    " << orderToJson(sellOrders[i]);
        if (i < (int)sellOrders.size() - 1) cout << ",";
        cout << endl;
    }
    
    cout << "  ]" << endl;
    cout << "}" << endl;

    return 0;
}