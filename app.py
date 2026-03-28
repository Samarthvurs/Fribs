import os
from flask import Flask, request, jsonify, send_from_directory
import sqlite3

app = Flask(__name__, static_folder='static')

db_file = 'database.db'

def get_db_connection():
    try:
        conn = sqlite3.connect(db_file)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Error connecting to SQLite: {e}")
        return None

# Serve static files (Frontend)
@app.route('/')
def serve_landing():
    return send_from_directory('static', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        # Check if email exists first
        cursor.execute("SELECT user_id, name, email, account_status, password FROM Users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        
        if not user_row:
            return jsonify({"error": "No account found with that email."}), 404
            
        user = dict(user_row)
        
        if user['password'] != password:
            return jsonify({"error": "Incorrect password. Please try again."}), 401
            
        # Remove password from response payload
        del user['password']
            
        return jsonify({
            "message": "Login successful",
            "user": user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()

@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, name, email, account_status, password FROM Users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        
        if not user_row:
            return jsonify({"error": "No account found."}), 404
            
        user = dict(user_row)
        
        if user['password'] != password:
            return jsonify({"error": "Incorrect password."}), 401
            
        if 'admin' not in user['email'].lower():
            return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
            
        del user['password']
            
        return jsonify({
            "message": "Admin login successful",
            "user": user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not all([name, email, password]):
        return jsonify({"error": "Name, email, and password required"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed. Ensure SQLite is active!"}), 500
        
    try:
        cursor = conn.cursor()
        # Check if email exists
        cursor.execute("SELECT email FROM Users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email is already registered!"}), 409
            
        # Insert new user
        cursor.execute(
            "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
            (name, email, password)
        )
        conn.commit()
        
        # Auto-login the user
        new_user_id = cursor.lastrowid
        cursor.execute("SELECT user_id, name, email, account_status FROM Users WHERE user_id = ?", (new_user_id,))
        new_user = dict(cursor.fetchone())
        
        return jsonify({
            "message": "Account created successfully",
            "user": new_user
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()

@app.route('/events', methods=['GET'])
def get_events():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Events")
    events = [dict(row) for row in cursor.fetchall()]
    
    cursor.close()
    conn.close()
    return jsonify(events)

@app.route('/seats/<int:event_id>', methods=['GET'])
def get_seats(event_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Seats WHERE event_id = ?", (event_id,))
    seats = [dict(row) for row in cursor.fetchall()]
    
    cursor.close()
    conn.close()
    return jsonify(seats)

@app.route('/book', methods=['POST'])
def book_seat():
    data = request.json
    user_id = data.get('user_id')
    event_id = data.get('event_id')
    seat_numbers = data.get('seats')

    if not all([user_id, event_id, seat_numbers]) or not isinstance(seat_numbers, list):
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
    
    try:
        cursor = conn.cursor()
        
        # Begin transaction (implicit with execute in sqlite unless configured otherwise, but we can be explicit)
        cursor.execute("BEGIN TRANSACTION")
        
        # 1. Check if user is blocked
        cursor.execute("SELECT account_status FROM Users WHERE user_id = ?", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.rollback()
            return jsonify({"error": "User not found"}), 404
            
        user = dict(user_row)
        if user['account_status'] == 'Blocked':
            conn.rollback()
            return jsonify({"error": "User account is blocked. Booking denied."}), 403

        # 2. Concurrency Control and Insert/Update Seats
        for seat_number in seat_numbers:
            cursor.execute("SELECT seat_id, status FROM Seats WHERE seat_number = ? AND event_id = ?", (seat_number, event_id))
            seat_row = cursor.fetchone()
            
            if seat_row:
                seat = dict(seat_row)
                if seat['status'] == 'Booked':
                    conn.rollback()
                    return jsonify({"error": f"Seat {seat_number} is already booked!"}), 409
                
                seat_id = seat['seat_id']
                cursor.execute("UPDATE Seats SET status = 'Booked' WHERE seat_id = ?", (seat_id,))
            else:
                cursor.execute("INSERT INTO Seats (event_id, seat_number, status) VALUES (?, ?, 'Booked')", (event_id, seat_number))
                seat_id = cursor.lastrowid
            
            # 3. Insert booking record
            cursor.execute(
                "INSERT INTO Bookings (user_id, event_id, seat_id, booking_status) VALUES (?, ?, ?, 'Confirmed')", 
                (user_id, event_id, seat_id)
            )
        
        # Commit Transaction
        conn.commit()
        
        return jsonify({"message": "Booking successful!"}), 201

    except Exception as e:
        conn.rollback() # Rollback on any database error
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/fraud', methods=['GET'])
def get_fraud_logs():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        # Fetch mostly suspicious or system action logs
        cursor.execute("""
            SELECT l.log_id, l.user_id, u.name as user_name, l.action, l.timestamp, l.status 
            FROM Activity_logs l
            LEFT JOIN Users u ON l.user_id = u.user_id
            ORDER BY l.timestamp DESC
        """)
        logs = [dict(row) for row in cursor.fetchall()]
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/users', methods=['GET'])
def get_all_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.user_id, u.name, u.email, u.account_status,
                   (SELECT COUNT(*) FROM Bookings b WHERE b.user_id = u.user_id) as total_bookings,
                   (SELECT MAX(timestamp) FROM Activity_logs a WHERE a.user_id = u.user_id) as last_activity
            FROM Users u
        """)
        users = [dict(row) for row in cursor.fetchall()]
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/bookings/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.booking_id, b.event_id, b.booking_status, b.booking_time, s.seat_number, e.event_name
            FROM Bookings b
            JOIN Seats s ON b.seat_id = s.seat_id
            JOIN Events e ON b.event_id = e.event_id
            WHERE b.user_id = ?
        """, (user_id,))
        
        raw_bookings = cursor.fetchall()
        
        # Group seats by event and booking time (or just event if user booked the same event multiple times, 
        # but to keep it simple, we group by event_id for the UI representation)
        grouped_bookings = {}
        for row in raw_bookings:
            k = row['event_id']
            if k not in grouped_bookings:
                grouped_bookings[k] = {
                    'booking_id': row['booking_id'],
                    'event_id': row['event_id'],
                    'event_name': row['event_name'],
                    'status': row['booking_status'],
                    'date': row['booking_time'],
                    'seats': []
                }
            grouped_bookings[k]['seats'].append(row['seat_number'])
            
        return jsonify(list(grouped_bookings.values()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/block', methods=['POST'])
def block_user():
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        
        # Admin Action
        cursor.execute("UPDATE Users SET account_status = 'Blocked' WHERE user_id = ?", (user_id,))
        cursor.execute("INSERT INTO Activity_logs (user_id, action, status) VALUES (?, ?, ?)", 
            (user_id, 'Admin blocked user account due to suspicious activity', 'System Action'))
        
        conn.commit()
        
        return jsonify({"message": f"User {user_id} blocked successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/unblock', methods=['POST'])
def unblock_user():
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500
        
    try:
        cursor = conn.cursor()
        
        # Admin Action
        cursor.execute("UPDATE Users SET account_status = 'Active' WHERE user_id = ?", (user_id,))
        cursor.execute("INSERT INTO Activity_logs (user_id, action, status) VALUES (?, ?, ?)", 
            (user_id, 'Admin unblocked user account', 'System Action'))
        
        conn.commit()
        
        return jsonify({"message": f"User {user_id} unblocked successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/events', methods=['POST'])
def create_event():
    data = request.json
    name = data.get('name')
    venue = data.get('venue')
    date = data.get('date')
    time = data.get('time')
    event_type = data.get('type')
    price = data.get('price')

    if not all([name, venue, date, time, event_type, price]):
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("BEGIN TRANSACTION")

        cursor.execute(
            "INSERT INTO Events (event_name, venue, event_date, event_time, event_type, price) VALUES (?, ?, ?, ?, ?, ?)",
            (name, venue, date, time, event_type, price)
        )
        new_event_id = cursor.lastrowid

        # Auto-provision 100 seats (e.g. Rows A-J, Cols 1-10)
        rows = ['A','B','C','D','E','F','G','H','I','J']
        seat_data = []
        for r in rows:
            for c in range(1, 11):
                seat_data.append((new_event_id, f"{r}{c}"))
        
        cursor.executemany("INSERT INTO Seats (event_id, seat_number) VALUES (?, ?)", seat_data)

        conn.commit()
        return jsonify({"message": "Event published successfully!", "event_id": new_event_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/scan', methods=['POST'])
def run_fraud_scan():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed."}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("BEGIN TRANSACTION")
        
        # Find users with > 10 bookings who are not yet blocked
        cursor.execute("""
            SELECT u.user_id 
            FROM Users u
            WHERE u.account_status != 'Blocked'
            AND (SELECT COUNT(*) FROM Bookings b WHERE b.user_id = u.user_id) > 10
        """)
        suspicious_users = cursor.fetchall()

        blocked_count = 0
        for row in suspicious_users:
            uid = row['user_id']
            cursor.execute("UPDATE Users SET account_status = 'Blocked' WHERE user_id = ?", (uid,))
            cursor.execute("INSERT INTO Activity_logs (user_id, action, status) VALUES (?, ?, ?)", 
                (uid, 'Auto-blocked by System Fraud Scan (> 10 bookings)', 'System Action'))
            blocked_count += 1
            
        conn.commit()
        return jsonify({"message": "Fraud scan complete", "blocked_count": blocked_count}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def init_db():
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Create Tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            account_status VARCHAR(50) DEFAULT 'Active'
        );

        CREATE TABLE IF NOT EXISTS Events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name VARCHAR(255) NOT NULL,
            venue VARCHAR(255) NOT NULL,
            event_date DATE NOT NULL,
            event_time TIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Seats (
            seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            seat_number VARCHAR(10) NOT NULL,
            status VARCHAR(50) DEFAULT 'Available',
            FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
            UNIQUE (event_id, seat_number)
        );

        CREATE TABLE IF NOT EXISTS Bookings (
            booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            seat_id INTEGER NOT NULL,
            booking_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            booking_status VARCHAR(50) DEFAULT 'Confirmed',
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
            FOREIGN KEY (seat_id) REFERENCES Seats(seat_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Activity_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action VARCHAR(255) NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'Normal',
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
        );
    """)

    # Attempt to safely add missing columns if upgrading schema without losing data
    try:
        cursor.execute("ALTER TABLE Events ADD COLUMN event_type VARCHAR(50) DEFAULT 'Movie'")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE Events ADD COLUMN price INTEGER DEFAULT 350")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Create Trigger for Fraud Detection
    # SQLite triggers syntax is slightly different than MySQL
    cursor.executescript("""
        DROP TRIGGER IF EXISTS After_Booking_Insert;
        
        CREATE TRIGGER After_Booking_Insert
        AFTER INSERT ON Bookings
        BEGIN
            -- Log normal activity
            INSERT INTO Activity_logs (user_id, action, status) 
            VALUES (NEW.user_id, 'Booked seat ' || NEW.seat_id || ' for event ' || NEW.event_id, 'Normal');
            
            -- Check for fraud: update user status to Blocked and log if there are >5 bookings in the last 1 minute
            INSERT INTO Activity_logs (user_id, action, status)
            SELECT NEW.user_id, 'Excessive bookings in 1 minute - Auto Blocked', 'Suspicious'
            WHERE (
                SELECT COUNT(*) FROM Activity_logs 
                WHERE user_id = NEW.user_id AND action LIKE 'Booked seat%' AND timestamp >= datetime('now', '-1 minute')
            ) > 5;
            
            UPDATE Users SET account_status = 'Blocked'
            WHERE user_id = NEW.user_id AND (
                SELECT COUNT(*) FROM Activity_logs 
                WHERE user_id = NEW.user_id AND action LIKE 'Booked seat%' AND timestamp >= datetime('now', '-1 minute')
            ) > 5;
        END;
    """)

    # Pre-populate dummy data only if tables are empty
    cursor.execute("SELECT COUNT(*) FROM Users")
    if cursor.fetchone()[0] == 0:
        cursor.executescript("""
            INSERT INTO Users (name, email, password) VALUES 
            ('Alice Smith', 'alice@example.com', 'hashed_pwd_1'),
            ('Bob Jones', 'bob@example.com', 'hashed_pwd_2');

            INSERT INTO Events (event_name, venue, event_date, event_time) VALUES 
            ('Avengers Screening', 'Main Theater', '2026-05-01', '18:00:00'),
            ('Tech Conference 2026', 'Convention Center', '2026-06-15', '09:00:00');

            INSERT INTO Seats (event_id, seat_number) VALUES 
            (1, 'A1'), (1, 'A2'), (1, 'A3'), (1, 'A4'), (1, 'A5'), (1, 'A6'), (1, 'A7'), (1, 'A8'), (1, 'A9'), (1, 'A10'),
            (2, 'R1'), (2, 'R2'), (2, 'R3'), (2, 'R4'), (2, 'R5');
        """)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    if not os.path.exists('static'):
        os.makedirs('static')
    init_db()  # Initialize the SQLite database automatically!
    app.run(debug=True, port=5000)
