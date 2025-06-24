# app.py
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Blueprint for doctor routes
doctor_bp = Blueprint('doctor', __name__)

# Database configuration
def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',      # Replace with your MySQL username
        password='root',  # Replace with your MySQL password
        database='shishuvrridhhidb'
    )

# Doctor Routes
@doctor_bp.route('/api/doctors', methods=['GET'])
def get_doctors():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT doctor_id, doctor_name, license_id, email_id, phone_number, 
                   created_date, specialization, qualifications
            FROM doctor
        """)
        doctors = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(doctors)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/api/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT doctor_id, doctor_name, license_id, email_id, phone_number, 
                   created_date, specialization, qualifications
            FROM doctor
            WHERE doctor_id = %s
        """, (doctor_id,))
        
        doctor = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
            
        return jsonify(doctor)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/api/doctors', methods=['POST'])
def create_doctor():
    try:
        data = request.json
        hashed_password = generate_password_hash(data['password'], method='sha256')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO doctor (doctor_name, password, license_id, email_id, phone_number, specialization, qualifications)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data['doctor_name'],
            hashed_password,
            data['license_id'],
            data['email_id'],
            data['phone_number'],
            data.get('specialization', ''),
            data.get('qualifications', '')
        ))
        
        conn.commit()
        doctor_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Doctor created successfully', 'doctor_id': doctor_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 400

# Message Routes
@doctor_bp.route('/api/messages', methods=['POST'])
def send_message():
    try:
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES (%s, %s, %s)
        """, (
            data['sender_id'],
            data['receiver_id'],
            data['content']
        ))
        
        conn.commit()
        message_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({'status': 'success', 'message_id': message_id})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 400

@doctor_bp.route('/api/messages/<int:user_id>/<int:doctor_id>', methods=['GET'])
def get_messages(user_id, doctor_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, sender_id, receiver_id, content, timestamp, is_read
            FROM messages
            WHERE (sender_id = %s AND receiver_id = %s) OR (sender_id = %s AND receiver_id = %s)
            ORDER BY timestamp
        """, (user_id, doctor_id, doctor_id, user_id))
        
        messages = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Convert datetime objects to strings
        for message in messages:
            if message['timestamp']:
                message['timestamp'] = message['timestamp'].isoformat()
        
        return jsonify(messages)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/api/messages/mark_read/<int:message_id>', methods=['PUT'])
def mark_message_read(message_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE messages
            SET is_read = TRUE
            WHERE id = %s
        """, (message_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 400

# Register blueprints
app.register_blueprint(doctor_bp, url_prefix='/doctor')

if __name__ == '__main__':
    # Initialize database tables if they don't exist
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create doctor table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doctor (
                doctor_id INT PRIMARY KEY AUTO_INCREMENT,
                doctor_name VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                license_id VARCHAR(50) UNIQUE NOT NULL,
                email_id VARCHAR(100) UNIQUE NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                specialization VARCHAR(100),
                qualifications TEXT
            )
        """)
        
        # Create messages table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Add test doctor if none exists
        cursor.execute("SELECT COUNT(*) FROM doctor")
        if cursor.fetchone()[0] == 0:
            hashed_password = generate_password_hash("test123", method='sha256')
            cursor.execute("""
                INSERT INTO doctor (doctor_name, password, license_id, email_id, phone_number, specialization, qualifications)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                "Dr. Abdul Naim Ostagar",
                hashed_password,
                "LIC12345",
                "abdul@example.com",
                "+1234567890",
                "Spine Surgery",
                "MBBS | MS Ortho | Neurospine Fellowship | Spine Training NUN (Singapore)"
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)