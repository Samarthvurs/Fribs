-- Create Database
CREATE DATABASE IF NOT EXISTS fraud_booking_system;
USE fraud_booking_system;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    account_status ENUM('Active', 'Suspicious', 'Blocked') DEFAULT 'Active'
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS Events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL
);

-- 3. Seats Table
CREATE TABLE IF NOT EXISTS Seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    status ENUM('Available', 'Booked') DEFAULT 'Available',
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_seat (event_id, seat_number) -- Prevent double booking definition on same seat
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    seat_id INT NOT NULL,
    booking_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id) ON DELETE CASCADE
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('Success', 'Failed', 'Pending') DEFAULT 'Pending',
    payment_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
);

-- 6. Activity Logs Table
CREATE TABLE IF NOT EXISTS Activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Normal',
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ==========================================
-- TRIGGERS for Fraud Detection & Logging
-- ==========================================
DELIMITER //

CREATE TRIGGER After_Booking_Insert
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    DECLARE booking_count INT;
    
    -- Log the normal activity first
    INSERT INTO Activity_logs (user_id, action, status) 
    VALUES (NEW.user_id, CONCAT('Booked seat ', NEW.seat_id, ' for event ', NEW.event_id), 'Normal');
    
    -- Count bookings made by the user in the last 1 minute using the Activity_logs table
    -- (This avoids MySQL Error 1442: Can't update/select table in trigger)
    SELECT COUNT(*) INTO booking_count 
    FROM Activity_logs 
    WHERE user_id = NEW.user_id 
    AND action LIKE 'Booked seat%'
    AND timestamp >= NOW() - INTERVAL 1 MINUTE;
    
    -- If bookings > 5 in 1 minute, mark as Suspicious
    IF booking_count > 5 THEN
        -- Log the fraud alert
        INSERT INTO Activity_logs (user_id, action, status) 
        VALUES (NEW.user_id, 'Excessive bookings in 1 minute', 'Suspicious');
        
        -- Update user account status
        UPDATE Users SET account_status = 'Suspicious' WHERE user_id = NEW.user_id;
    END IF;
END; //

DELIMITER ;


-- ==========================================
-- STORED PROCEDURE for Admin Action
-- ==========================================
DELIMITER //

CREATE PROCEDURE BlockUser(IN p_user_id INT)
BEGIN
    -- Update User's account status
    UPDATE Users SET account_status = 'Blocked' WHERE user_id = p_user_id;
    
    -- Log the admin action
    INSERT INTO Activity_logs (user_id, action, status) 
    VALUES (p_user_id, 'Admin blocked user account due to suspicious activity', 'System Action');
END; //

DELIMITER ;


-- ==========================================
-- INSERT SAMPLE DATA
-- ==========================================

-- Insert Users
INSERT INTO Users (name, email, password) VALUES 
('Alice Smith', 'alice@example.com', 'hashed_pwd_1'),
('Bob Jones', 'bob@example.com', 'hashed_pwd_2'),
('Charlie Brown', 'charlie@example.com', 'hashed_pwd_3');

-- Insert Events
INSERT INTO Events (event_name, venue, event_date, event_time) VALUES 
('Avengers Screening', 'Main Theater', '2026-05-01', '18:00:00'),
('Tech Conference 2026', 'Convention Center', '2026-06-15', '09:00:00');

-- Insert Seats for Event 1 (Avengers)
INSERT INTO Seats (event_id, seat_number) VALUES 
(1, 'A1'), (1, 'A2'), (1, 'A3'), (1, 'A4'), (1, 'A5'), (1, 'A6'), (1, 'A7'), (1, 'A8'), (1, 'A9'), (1, 'A10');

-- Insert Seats for Event 2 (Tech Conf)
INSERT INTO Seats (event_id, seat_number) VALUES 
(2, 'R1'), (2, 'R2'), (2, 'R3'), (2, 'R4'), (2, 'R5');
