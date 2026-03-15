#include<bits/stdc++.h>
#include "login.h"
#include "trading.h"
using namespace std;

int main(){

    while(true){

        cout<<"\n1 Register\n";
        cout<<"2 Login\n";
        cout<<"3 Quit\n";

        int choice;
        cin>>choice;

        if(choice==1)
            registeruser();

        else if(choice==2){

            int id=login();

            if(id!=-1){
                cout<<"Access granted"<<endl;
                userMenu(id);
            }
        }

        else if(choice==3)
            break;

        else
            cout<<"Invalid choice"<<endl;
    }
}