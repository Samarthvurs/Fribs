# Fraud-Resistant Intelligent Booking System

This is a full-stack, fraud-resistant event booking platform designed for DBMS and concurrency features. 

**Key DBMS Features demonstrated:**
1. **Transactions & Row-Level Locking:** Handles concurrent bookings using `SELECT ... FOR UPDATE` to avoid double-booking the same seat.
2. **Triggers:** MySQL Trigger implicitly logs events and detects unusual booking volumes (>5 bookings/min), automatically marking accounts as 'Suspicious'.
3. **Stored Procedures:** Exposes a procedure `BlockUser` to enforce system-wide bans on hostile actors through the admin dashboard.
4. **Constraints:** Relational Integrity, `ON DELETE CASCADE`, and a `UNIQUE` identifier on `(event_id, seat_number)`.

---

## 🛠 Prerequisites

Make sure you have the following installed:
1. **MySQL Server** (e.g., via XAMPP, WAMP, or standalone).
2. **Python 3.8+**

---

## 🚀 Step 1: Database Setup

1. Open your MySQL client (e.g., phpMyAdmin, MySQL Workbench, or CLI).
2. Load and run the provided SQL script:
   - Import or execute the contents of `db_schema.sql`.
   - This creates the `fraud_booking_system` database, tables, triggers, and stores demo users and events.

> **Note:** Do not change the database name unless you plan to update `app.py`.

---

## 💻 Step 2: Backend Setup (Flask)

1. Open your terminal and navigate to the project directory:
   ```bash
   cd "DS - Project ( anti fraud )"
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Activate on Windows:
   venv\Scripts\activate
   ```

3. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Database Credentials:
   - Open `app.py`.
   - Edit the `DB_CONFIG` dictionary on line 8 to match your local MySQL credentials:
      ```python
      DB_CONFIG = {
          'host': 'localhost',
          'user': 'root', # Your MySQL username
          'password': '', # Your MySQL password
          'database': 'fraud_booking_system',
          'autocommit': False
      }
      ```

5. Run the Server:
   ```bash
   python app.py
   ```
   *The server will start on `http://127.0.0.1:5000`.*

---

## 🌐 Step 3: Accessing the Application

With the Flask server running, open your web browser and navigate to:

- **Booking Page:** [http://127.0.0.1:5000/](http://127.0.0.1:5000/) 
  - *Demo Users:* ID `1`, `2`, or `3`.
  - Enter the User ID, select an event, a seat, and click Book.

- **Admin Dashboard:** [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin)
  - View real-time activity and fraud logs.
  - If a user tests the bounds of the trigger (clicking Book >5 times in a minute for another event), they will be flagged.
  - You can permanently **Block** the suspended user right from the dashboard.

---

## 🧪 Testing the Advanced Features

1. **Test Concurrency (Double Booking Error):** Open two terminal tabs (or tabs in the browser) and try booking the exact same seat for the exact same event at the exact same time. The database locking (`FOR UPDATE`) will ensure only one user secures the ticket.
2. **Test Fraud Trigger:** Go to the booking page. Quickly hit the "Confirm Booking" button (or book 6 distinct seats) using User ID `1` under a 60-second window. Observe the Admin Dashboard. The system will flag them as `Suspicious`.
3. **Test Stored Procedure:** As an admin, click "Block User 1" on the dashboard. Now go back to the booking page and try booking another seat as User ID `1`. The backend will firmly deny access stating the account is blocked.
