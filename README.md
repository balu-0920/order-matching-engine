# Order Matching Engine (C++)
A simple **Order Matching Engine simulator with user authentication** written in C++.
Users can register, log in, place buy/sell orders, and trades are executed when matching conditions are satisfied.

## Features

* User registration with **auto-generated unique ID**
* **Login system** using ID and password
* Place **Buy and Sell orders**
* **Order book display**
* **Automatic trade execution** when Buy price ≥ Sell price
* **Trade notifications** shown when the user logs in
* File-based storage using `users.txt` and `trades.txt`

## Project Structure

```
main.cpp      → main program and menu
login.cpp     → registration and login system
trading.cpp   → order book and matching engine
users.txt     → stored user accounts
trades.txt    → executed trades
```

## Compile & Run

```
g++ main.cpp login.cpp trading.cpp -o engine
./engine
```

## Example Workflow

1. Register two users
2. User A places a **Buy order**
3. User B places a **Sell order**
4. If prices match, the trade is executed
5. Users receive notifications on next login

## Technologies

* C++
* File Handling (`fstream`)
* Basic Data Structures

## Purpose

This project demonstrates the **basic working principles of trading exchanges and order matching systems**.

