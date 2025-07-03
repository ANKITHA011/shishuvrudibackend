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

online_users = set()

@app.route('/')
def index():
    return "✅ Chat server is running."

@app.route('/messages/<room_id>', methods=['GET'])
def get_messages(room_id):
    cursor.execute("SELECT sender, text, timestamp FROM messages WHERE room_id = %s ORDER BY timestamp ASC", (room_id,))
    return jsonify(cursor.fetchall())

@socketio.on('join_room')
def handle_join(data):
    room = data.get('room')
    user = data.get('user')
    join_room(room)
    online_users.add(user)
    emit('system_message', {'message': f"{user} has joined the chat."}, room=room)
    emit('user_status', {'user': user, 'status': 'online'}, broadcast=True)
    print(f"✅ {user} joined {room}")

@socketio.on('leave_room')
def handle_leave(data):
    room = data.get('room')
    user = data.get('user')
    leave_room(room)
    online_users.discard(user)
    emit('user_status', {'user': user, 'status': 'offline'}, broadcast=True)
    print(f"❌ {user} left {room}")

@socketio.on('send_message')
def handle_send(data):
    room = data['room']
    sender = data['sender']
    message = data['message']
    timestamp = data['timestamp']
    cursor.execute("INSERT INTO messages (room_id, sender, text, timestamp) VALUES (%s, %s, %s, %s)",
                   (room, sender, message, timestamp))
    db.commit()
    emit('receive_message', {'sender': sender, 'text': message, 'timestamp': timestamp}, room=room)

if __name__ == '__main__':
    print("🚀 Starting SocketIO server...")
    socketio.run(app, host="127.0.0.1", port=5001, debug=True)
