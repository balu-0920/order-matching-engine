#include<bits/stdc++.h>
#include "trading.h"
using namespace std;

struct Order{
    int orderID;
    int userID;
    string company;
    int price;
    int quantity;
    int amount;
    string type;
};

vector<Order> buyOrders;
vector<Order> sellOrders;

int orderCounter = 1;

/* user holdings */
map<int, vector<pair<string,int>>> userStocks;

/* company availability */

map<string,int> companyStock = {
    {"TCS",100},
    {"INFY",120},
    {"RELIANCE",80},
    {"APPLE",50}
};

void showCompanies(){

    cout<<"\nAvailable Companies\n";

    for(auto &c : companyStock)
        cout<<c.first<<" : "<<c.second<<" units\n";
}

/* get owned quantity */

int getOwnedQuantity(int userID,string company){

    for(auto &p : userStocks[userID])
        if(p.first == company)
            return p.second;

    return 0;
}

/* add stock to user */

void addStock(int userID,string company,int qty){

    for(auto &p : userStocks[userID]){

        if(p.first == company){
            p.second += qty;
            return;
        }
    }

    userStocks[userID].push_back({company,qty});
}

/* reduce stock */

void reduceStock(int userID,string company,int qty){

    for(auto &p : userStocks[userID]){

        if(p.first == company){
            p.second -= qty;
            return;
        }
    }
}

/* record trade */

void recordTrade(int buyer,int seller,string company,int price,int qty){

    ofstream file("trades.txt",ios::app);

    file<<buyer<<" "
        <<seller<<" "
        <<company<<" "
        <<price<<" "
        <<qty<<endl;

    file.close();
}

/* matching engine */

void matchOrders(){

    for(int i=0;i<buyOrders.size();i++){

        for(int j=0;j<sellOrders.size();j++){

            if(buyOrders[i].company == sellOrders[j].company &&
               buyOrders[i].price >= sellOrders[j].price){

                int qty = min(buyOrders[i].quantity,
                              sellOrders[j].quantity);

                cout<<"\nTRADE EXECUTED\n";
                cout<<"Company: "<<buyOrders[i].company<<"\n";
                cout<<"Price: "<<sellOrders[j].price<<"\n";
                cout<<"Quantity: "<<qty<<"\n";

                recordTrade(buyOrders[i].userID,
                            sellOrders[j].userID,
                            buyOrders[i].company,
                            sellOrders[j].price,
                            qty);

                addStock(buyOrders[i].userID,
                         buyOrders[i].company,
                         qty);

                reduceStock(sellOrders[j].userID,
                            sellOrders[j].company,
                            qty);

                buyOrders[i].quantity -= qty;
                sellOrders[j].quantity -= qty;

                if(buyOrders[i].quantity == 0){
                    buyOrders.erase(buyOrders.begin()+i);
                    i--;
                    break;
                }

                if(sellOrders[j].quantity == 0){
                    sellOrders.erase(sellOrders.begin()+j);
                    j--;
                }
            }
        }
    }
}

/* BUY ORDER */

void placeBuyOrder(int userID){

    Order order;

    order.orderID = orderCounter++;
    order.userID = userID;
    order.type = "BUY";

    showCompanies();

    cout<<"Enter Company Name: ";
    cin>>order.company;

    int available = companyStock[order.company];

    cout<<"Maximum you can buy: "<<available<<" shares\n";

    cout<<"Enter Quantity: ";
    cin>>order.quantity;

    if(order.quantity > available){

        cout<<"You can buy at most "<<available<<" shares\n";
        order.quantity = available;
    }

    cout<<"Enter Price: ";
    cin>>order.price;

    order.amount = order.price * order.quantity;

    buyOrders.push_back(order);

    cout<<"Buy order placed\n";

    matchOrders();
}

/* SELL ORDER */

void placeSellOrder(int userID){

    Order order;

    order.orderID = orderCounter++;
    order.userID = userID;
    order.type = "SELL";

    cout<<"\nYour Holdings\n";

    for(auto &p : userStocks[userID])
        cout<<p.first<<" : "<<p.second<<" shares\n";

    cout<<"Enter Company Name: ";
    cin>>order.company;

    int owned = getOwnedQuantity(userID,order.company);

    if(owned == 0){
        cout<<"You do not own this stock\n";
        return;
    }

    cout<<"You own "<<owned<<" shares\n";

    cout<<"Enter Quantity: ";
    cin>>order.quantity;

    if(order.quantity > owned){

        cout<<"You can sell at most "<<owned<<" shares\n";
        order.quantity = owned;
    }

    cout<<"Enter Price: ";
    cin>>order.price;

    order.amount = order.price * order.quantity;

    sellOrders.push_back(order);

    cout<<"Sell order placed\n";

    matchOrders();
}

/* ORDER BOOK */

void viewOrderBook(){

    cout<<"\nSELL ORDERS\n";

    for(auto &o : sellOrders){

        cout<<"OrderID "<<o.orderID
            <<" User "<<o.userID
            <<" Company "<<o.company
            <<" Price "<<o.price
            <<" Qty "<<o.quantity<<"\n";
    }

    cout<<"\nBUY ORDERS\n";

    for(auto &o : buyOrders){

        cout<<"OrderID "<<o.orderID
            <<" User "<<o.userID
            <<" Company "<<o.company
            <<" Price "<<o.price
            <<" Qty "<<o.quantity<<"\n";
    }
}

/* USER MENU */

void userMenu(int userID){

    int choice;

    while(true){

        cout<<"\n1 Place Buy Order\n";
        cout<<"2 Place Sell Order\n";
        cout<<"3 View Order Book\n";
        cout<<"4 Logout\n";

        cout<<"Enter choice: ";
        cin>>choice;

        if(choice == 1)
            placeBuyOrder(userID);

        else if(choice == 2)
            placeSellOrder(userID);

        else if(choice == 3)
            viewOrderBook();

        else if(choice == 4)
            break;

        else
            cout<<"Invalid choice\n";
    }
}
