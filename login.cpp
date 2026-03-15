#include<bits/stdc++.h>
using namespace std;

int getnewid(){

    ifstream file("users.txt");

    int id;
    string name,pass;
    int lastid=0;

    while(file>>id>>name>>pass)
        lastid=id;

    file.close();
    return lastid+1;
}

void registeruser(){

    string name,pass;

    cout<<"Enter name: ";
    cin>>name;

    cout<<"Enter password: ";
    cin>>pass;

    int newid=getnewid();

    ofstream file("users.txt",ios::app);
    file<<newid<<" "<<name<<" "<<pass<<endl;
    file.close();

    cout<<"Successfully registered!"<<endl;
    cout<<"Your ID : "<<newid<<endl;
}

int login(){

    int id;
    string pass;

    cout<<"Enter Your ID: ";
    cin>>id;

    cout<<"Enter Your Password: ";
    cin>>pass;

    int fid;
    string fname,fpass;

    ifstream file("users.txt");

    while(file>>fid>>fname>>fpass){

        if(fid==id && fpass==pass){

            cout<<"Login successful!"<<endl;
            return id;
        }
    }

    file.close();

    cout<<"Invalid Id and Password"<<endl;
    return -1;
}