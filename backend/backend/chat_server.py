from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 🔌 Connect to MySQL
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="shishuvrridhhidb"
)
cursor = db.cursor(dictionary=True)

@app.route('/')
def index():
    return "✅ Chat server is running."

# 📥 API to fetch previous messages
@app.route('/messages/<room_id>', methods=['GET'])
def get_messages(room_id):
    cursor.execute("SELECT sender, text, timestamp FROM messages WHERE room_id = %s ORDER BY timestamp ASC", (room_id,))
    messages = cursor.fetchall()
    return jsonify(messages)

@socketio.on('connect')
def on_connect():
    print("🟢 Client connected")

@socketio.on('disconnect')
def on_disconnect():
    print("🔴 Client disconnected")

@socketio.on('join_room')
def handle_join(data):
    room = data.get('room')
    user = data.get('user')
    join_room(room)
    print(f"✅ {user} joined room: {room}")
    emit('system_message', {'message': f"{user} has joined the chat."}, room=room)

@socketio.on('send_message')
def handle_send(data):
    room = data.get('room')
    sender = data.get('sender')
    message = data.get('message')
    timestamp = data.get('timestamp')

    # 💾 Save message to DB
    cursor.execute(
        "INSERT INTO messages (room_id, sender, text, timestamp) VALUES (%s, %s, %s, %s)",
        (room, sender, message, timestamp)
    )
    db.commit()

    # 🧠 If the sender is a parent, create a notification
    if sender.lower() != "doctor" and "Dr" not in sender:
        try:
            # Extract child_id and doctor_phone from room_id
            parts = room.split("_")
            if len(parts) >= 2:
                child_id = parts[0]
                doctor_phone = parts[1]
                
                # Optionally fetch parent/child name from elsewhere if not available
                parent_name = sender
                child_name = f"Child_{child_id}"  # Replace with actual child name from DB if needed

                cursor.execute(
                    """INSERT INTO notifications (child_id, child_name, parent_name, doctor_phone, message, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s)""",
                    (child_id, child_name, parent_name, doctor_phone, message, timestamp)
                )
                db.commit()
        except Exception as e:
            print("❌ Failed to store notification:", e)

    print(f"📨 Message from {sender} in room [{room}]: {message}")
    emit('receive_message', {
        'sender': sender,
        'text': message,
        'timestamp': timestamp
    }, room=room)


if __name__ == '__main__':
    print("🚀 Starting SocketIO server...")
    socketio.run(app, host="127.0.0.1", port=5001, debug=True)
