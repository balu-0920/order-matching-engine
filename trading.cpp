#include<bits/stdc++.h>
#include "trading.h"
using namespace std;

struct Order{
    int userID;
    int price;
    int quantity;
};

vector<Order> buyOrders;
vector<Order> sellOrders;

void recordTrade(int buyer,int seller,int price,int qty){

    ofstream file("trades.txt",ios::app);
    file<<buyer<<" "<<seller<<" "<<price<<" "<<qty<<endl;
    file.close();
}

void matchOrders(){

    if(buyOrders.empty() || sellOrders.empty())
        return;

    Order &buy = buyOrders.back();
    Order &sell = sellOrders.back();

    if(buy.price >= sell.price){

        int qty=min(buy.quantity,sell.quantity);

        cout<<"\nTRADE EXECUTED"<<endl;
        cout<<"Price "<<sell.price<<" Qty "<<qty<<endl;

        recordTrade(buy.userID,sell.userID,sell.price,qty);

        buy.quantity-=qty;
        sell.quantity-=qty;

        if(buy.quantity==0)
            buyOrders.pop_back();

        if(sell.quantity==0)
            sellOrders.pop_back();
    }
}

void placeBuyOrder(int userID){

    Order order;

    order.userID=userID;

    cout<<"Enter Price: ";
    cin>>order.price;

    cout<<"Enter Quantity: ";
    cin>>order.quantity;

    buyOrders.push_back(order);

    matchOrders();
}

void placeSellOrder(int userID){

    Order order;

    order.userID=userID;

    cout<<"Enter Price: ";
    cin>>order.price;

    cout<<"Enter Quantity: ";
    cin>>order.quantity;

    sellOrders.push_back(order);

    matchOrders();
}

void viewOrderBook(){

    cout<<"\nSELL ORDERS\n";

    for(auto &o:sellOrders)
        cout<<"User "<<o.userID<<" Price "<<o.price<<" Qty "<<o.quantity<<endl;

    cout<<"\nBUY ORDERS\n";

    for(auto &o:buyOrders)
        cout<<"User "<<o.userID<<" Price "<<o.price<<" Qty "<<o.quantity<<endl;
}

void checkTrades(int userID){

    ifstream file("trades.txt");

    int buyer,seller,price,qty;

    while(file>>buyer>>seller>>price>>qty){

        if(buyer==userID)
            cout<<"\nNotification: You bought "<<qty<<" units at "<<price<<endl;

        if(seller==userID)
            cout<<"\nNotification: You sold "<<qty<<" units at "<<price<<endl;
    }

    file.close();
}

void userMenu(int userID){

    checkTrades(userID);

    int choice;

    while(true){

        cout<<"\n1 Place Buy Order\n";
        cout<<"2 Place Sell Order\n";
        cout<<"3 View Order Book\n";
        cout<<"4 Logout\n";
        cout<<"Enter choice: ";

        cin>>choice;

        if(choice==1)
            placeBuyOrder(userID);

        else if(choice==2)
            placeSellOrder(userID);

        else if(choice==3)
            viewOrderBook();

        else if(choice==4)
            break;

        else
            cout<<"Invalid choice\n";
    }
}