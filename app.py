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
    return send_from_directory('static', 'landing.html')

@app.route('/dashboard')
def serve_dashboard():
    return send_from_directory('static', 'index.html')

@app.route('/admin')
def serve_admin():
    return send_from_directory('static', 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/login')
def serve_login():
    return send_from_directory('static', 'login.html')

@app.route('/signup')
def serve_signup():
    return send_from_directory('static', 'signup.html')

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
    seat_id = data.get('seat_id')

    if not all([user_id, event_id, seat_id]):
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

        # 2. Concurrency Control - SQLite uses file-level locks during write transactions.
        # So we query it normally, but the BEGIN TRANSACTION protects against race conditions here.
        cursor.execute("SELECT status FROM Seats WHERE seat_id = ? AND event_id = ?", (seat_id, event_id))
        seat_row = cursor.fetchone()
        
        if not seat_row:
            conn.rollback()
            return jsonify({"error": "Seat not found for the given event"}), 404
            
        seat = dict(seat_row)
        if seat['status'] == 'Booked':
            conn.rollback()
            return jsonify({"error": "Seat is already booked!"}), 409
            
        # 3. Update seat status to Booked
        cursor.execute("UPDATE Seats SET status = 'Booked' WHERE seat_id = ?", (seat_id,))
        
        # 4. Insert booking record
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

    # Create Trigger for Fraud Detection
    # SQLite triggers syntax is slightly different than MySQL
    cursor.executescript("""
        CREATE TRIGGER IF NOT EXISTS After_Booking_Insert
        AFTER INSERT ON Bookings
        BEGIN
            -- Log normal activity
            INSERT INTO Activity_logs (user_id, action, status) 
            VALUES (NEW.user_id, 'Booked seat ' || NEW.seat_id || ' for event ' || NEW.event_id, 'Normal');
            
            -- Check for fraud: update user status and log if there are >5 bookings in the last 1 minute
            -- In SQLite, we can use an INSERT and UPDATE statement dependent on a subquery
            INSERT INTO Activity_logs (user_id, action, status)
            SELECT NEW.user_id, 'Excessive bookings in 1 minute', 'Suspicious'
            WHERE (
                SELECT COUNT(*) FROM Activity_logs 
                WHERE user_id = NEW.user_id AND action LIKE 'Booked seat%' AND timestamp >= datetime('now', '-1 minute')
            ) > 5;
            
            UPDATE Users SET account_status = 'Suspicious'
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
