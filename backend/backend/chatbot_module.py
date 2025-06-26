import os
import base64
import tempfile
import json
from flask import Blueprint, request, jsonify
import google.generativeai as genai
import redis
import mysql.connector
import mysql.connector.pooling
from langdetect import detect
from deep_translator import GoogleTranslator
from gtts import gTTS
from datetime import datetime, timedelta
import traceback
from dateutil.relativedelta import relativedelta

chatbot_bp = Blueprint("chatbot", __name__)

# Configure Gemini API
genai.configure(api_key="AIzaSyDO-nvH8fpcmru_FE61GpsU-nDOwaVko") # Replace with your actual API key
model = genai.GenerativeModel("gemini-1.5-flash-latest")

# Redis setup
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)

# --- Consolidated Database Connection Pool Setup ---
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "shishuvrridhhidb",
    "pool_name": "chatbot_pool",
    "pool_size": 10, # Increased pool size for better concurrency
    "autocommit": False # Set to False for manual commit
}

connection_pool = None

try:
    connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)
    print("✅ MySQL Connection Pool created successfully.")
except Exception as e:
    print(f"❌ Critical Error: Could not create MySQL connection pool: {e}")
    # In a real application, you might want to exit or handle this more gracefully
    # if the database is essential for startup.
    exit(1) # Exit if we can't establish a database connection pool

def get_db_connection():
    """Get a connection from the pool with automatic reconnection and proper error handling."""
    if connection_pool is None:
        raise Exception("Database connection pool is not initialized.")
    conn = None
    try:
        conn = connection_pool.get_connection()
        # Verify the connection is alive and reconnect if necessary
        if not conn.is_connected():
            conn.reconnect()
        return conn
    except mysql.connector.Error as db_err:
        print(f"❌ MySQL Error getting connection: {db_err}")
        traceback.print_exc()
        raise
    except Exception as e:
        print(f"❌ Unexpected error getting database connection: {e}")
        traceback.print_exc()
        raise

# --- Language Detection and Translation Functions ---

def detect_lang(text):
    try:
        return detect(text)
    except:
        return 'en'

def translate_to_en(text):
    lang = detect_lang(text)
    if lang != 'en':
        try:
            translated = GoogleTranslator(source=lang, target='en').translate(text)
            return translated, lang
        except Exception as e:
            print(f"Translation to EN failed: {e}")
            return text, lang
    return text, lang

def translate_from_en(text, lang):
    if lang != 'en':
        try:
            translated = GoogleTranslator(source='en', target=lang).translate(text)
            return translated
        except Exception as e:
            print(f"Translation from EN failed: {e}")
            return text
    return text

def generate_audio(text, lang='en'):
    try:
        tts = gTTS(text=text, lang=lang)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tts.save(tmp.name)
            with open(tmp.name, "rb") as f:
                encoded = base64.b64encode(f.read()).decode()
            os.remove(tmp.name)
            return encoded
    except Exception as e:
        print("TTS error:", e)
        traceback.print_exc()
        return None

# --- Chat History Functions (Modified to use get_db_connection) ---

def get_history(childid):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT chatrole, content, createddate
                FROM tblchat
                WHERE chatchildid=%s
                ORDER BY createddate ASC
            """, (childid,))
            history = cursor.fetchall()

        for h in history:
            if isinstance(h['createddate'], datetime):
                h['createddate'] = h['createddate'].strftime("%Y-%m-%d %H:%M:%S")
        return history
    except Exception as e:
        print(f"❌ Error in get_history for childid {childid}: {e}")
        traceback.print_exc()
        raise
    finally:
        if conn:
            conn.close()

def save_message(childid, chatrole, content):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                INSERT INTO tblchat (chatchildid, chatrole, content)
                VALUES (%s, %s, %s)
            """, (childid, chatrole, content))
            conn.commit()

            cursor.execute("""
                SELECT createddate FROM tblchat
                WHERE chatid = LAST_INSERT_ID()
            """)
            result = cursor.fetchone()
            createddate = result['createddate'].strftime("%Y-%m-%d %H:%M:%S") if result else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return createddate
    except Exception as e:
        print(f"❌ Error in save_message for childid {childid}, role {chatrole}: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback() # Rollback on error
        raise
    finally:
        if conn:
            conn.close()

# --- Chatbot Response Route ---

@chatbot_bp.route("/respond", methods=["POST"])
def chatbot_response():
    try:
        data = request.json
        message = data.get("message")
        age = data.get("age")
        gender = data.get("gender")
        name = data.get("name")
        phone = data.get("phone")
        childid = data.get("childid")

        if message == "__load_history__":
            history = get_history(childid)
            return jsonify({"history": history})

        if message == "__load_history__preview__":
            history = get_history(childid)
            if not history:
                return jsonify({"preview": None})

            full_text = " ".join([msg["content"] for msg in history])

            summary_prompt = (
                f"Summarize the following conversation in under 50 words. "
                f"This is a discussion between a parent and an Early Childhood Development (ECD) expert about {name}, "
                f"a {age}-month-old {gender} child. Focus on the main topics discussed and any key advice shared:\n\n"
                f"{full_text}\n\n"
                f"Summary (max 50 words):"
            )

            response = model.generate_content(summary_prompt)
            short_summary = response.text.strip()

            return jsonify({"preview": short_summary})

        if message.startswith("__generate_summary__:"):
            conversation_context = message.replace("__generate_summary__:", "").strip()

            summary_prompt = (
                f"Based on the previous conversation between a parent and an Early Childhood Development (ECD) expert about "
                f"{name}, a {age}-month-old {gender}, write a brief, warm, and friendly welcome back message. "
                f"The message should summarize the main topics discussed, highlight key points, and invite the parent to continue the conversation. "
                f"Keep the tone conversational, supportive, and engaging.\n\n"
                f"Previous conversation:\n{conversation_context}\n\n"
                f"Create a welcoming message that acknowledges the prior discussion and encourages ongoing interaction:"
            )

            response = model.generate_content(summary_prompt)
            summary_response = response.text.strip()

            translated_input, lang = translate_to_en(conversation_context[:100]) # Use context for lang detection
            final_response = translate_from_en(summary_response, lang)

            audio = generate_audio(final_response, lang)

            return jsonify({
                "response": final_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "audio": audio
            })

        # Normal user message handling
        translated_input, lang = translate_to_en(message)
        user_message_timestamp = save_message(childid, 'user', message)

        history = get_history(childid)
        conversation_history = ""
        for h in history:
            role = "Parent" if h["chatrole"] == "user" else "ECD Expert"
            conversation_history += f"{role}: {h['content']}\n"

        prompt = (
            f"You are a certified Early Childhood Development expert and pediatric consultant.\n"
            f"A parent is asking about their {age}-month-old {gender} child named {name}.\n"
            f"Provide helpful, simple, age-appropriate guidance.\n\n"
            "Provide an evidence-based response that:\n"
            "- Addresses their specific concern with empathy\n"
            "- Offers practical, actionable advice\n"
            "- Suggests when to consult a pediatrician if relevant\n"
            "- Remember the parent and child are from India\n"
            "- Uses encouraging, supportive language\n\n"
            "-response should be point wise not a paragraph and easy to understand next point should begin in a new line\n"
            f"Limit the response to 50-100 words\n"
            f"{conversation_history}"
            f"Parent: {translated_input}\n"
            f"ECD Expert:"
        )

        response = model.generate_content(prompt)
        bot_response_en = response.text.strip()
        bot_response = translate_from_en(bot_response_en, lang)

        bot_message_timestamp = save_message(childid, 'model', bot_response)
        audio = generate_audio(bot_response, lang)

        return jsonify({
            "response": bot_response,
            "timestamp": bot_message_timestamp,
            "audio": audio
        })

    except Exception as e:
        print(f"❌ Error in chatbot_response: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- Children Endpoints (Modified to use get_db_connection) ---

@chatbot_bp.route("/children", methods=["POST"])
def get_registered_children():
    data = request.json
    phone = data.get("phone")
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT childid, childname, childgender, childdateofbirth
                FROM tblchildinfo
                WHERE chlildparentphoneno = %s
            """, (phone,))
            children_data = cursor.fetchall()

        today = datetime.now().date()
        children = []

        for child in children_data:
            dob = child.get("childdateofbirth")
            if dob:
                if isinstance(dob, str):
                    dob = datetime.strptime(dob, "%Y-%m-%d").date()

                age = relativedelta(today, dob)
                age_str = f"{age.months} m, {age.days} d"
            else:
                age_str = "Unknown"

            children.append({
                "id": child["childid"],
                "name": child["childname"],
                "gender": child["childgender"],
                "date_of_birth": str(child["childdateofbirth"]), # Ensure date is string for JSON
                "age": age_str,
            })

        return jsonify(children)
    except Exception as e:
        print(f"❌ Error in get_registered_children for phone {phone}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@chatbot_bp.route("/children/<int:child_id>", methods=["DELETE"])
def delete_child(child_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("DELETE FROM tblchildinfo WHERE childid = %s", (child_id,))
            conn.commit()
        return jsonify({"message": "Child deleted successfully"}), 200
    except Exception as e:
        print(f"❌ Error in delete_child for child_id {child_id}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- Child Assessment Endpoints (Modified to use get_db_connection) ---

def get_ideal_ranges(age_months, gender=None):
    # Month-specific ideal values for 0-12 months (you can fine-tune these based on real growth data)
    month_data = {
        0: {"height_min": 45, "height_max": 52, "weight_min": 2.5, "weight_max": 4.0},
        1: {"height_min": 50, "height_max": 56, "weight_min": 3.0, "weight_max": 5.0},
        2: {"height_min": 52, "height_max": 58, "weight_min": 3.5, "weight_max": 5.8},
        3: {"height_min": 54, "height_max": 61, "weight_min": 4.0, "weight_max": 6.5},
        4: {"height_min": 56, "height_max": 63, "weight_min": 4.5, "weight_max": 7.0},
        5: {"height_min": 58, "height_max": 65, "weight_min": 5.0, "weight_max": 7.5},
        6: {"height_min": 60, "height_max": 67, "weight_min": 5.5, "weight_max": 8.0},
        7: {"height_min": 61, "height_max": 68, "weight_min": 6.0, "weight_max": 8.5},
        8: {"height_min": 62, "height_max": 69, "weight_min": 6.2, "weight_max": 9.0},
        9: {"height_min": 63, "height_max": 70, "weight_min": 6.4, "weight_max": 9.3},
        10: {"height_min": 64, "height_max": 71, "weight_min": 6.6, "weight_max": 9.6},
        11: {"height_min": 65, "height_max": 73, "weight_min": 6.8, "weight_max": 10.0},
        12: {"height_min": 66, "height_max": 75, "weight_min": 7.0, "weight_max": 10.5}
    }

    # Default fallback range if age out of bounds
    default_range = {"height_min": 45, "height_max": 85, "weight_min": 2.0, "weight_max": 15.0}

    return month_data.get(age_months, default_range)


@chatbot_bp.route("/child_assessment", methods=["POST", "OPTIONS"])
def child_assessment():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response

    conn = None
    try:
        data = request.get_json()
        if data is None:
            response = jsonify({"error": "Invalid or missing JSON in request"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        name = data.get("name", "the child")
        gender = data.get("gender")
        child_id = data.get("id")

        try:
            age_months = int(data.get("age"))
            height_cm = float(data.get("height"))
            weight_kg = float(data.get("weight"))
        except (TypeError, ValueError):
            response = jsonify({"error": "Invalid input types for age, height, or weight"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        if not child_id:
            response = jsonify({"error": "Child ID is required for assessment"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        if not (0 <= age_months <= 12):
            response = jsonify({"error": "Age must be between 0 and 12 months"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        ideal_ranges = get_ideal_ranges(age_months, gender)
        ideal_height_min = ideal_ranges["height_min"]
        ideal_height_max = ideal_ranges["height_max"]
        ideal_weight_min = ideal_ranges["weight_min"]
        ideal_weight_max = ideal_ranges["weight_max"]

        # Validate input against a reasonable range (allow some buffer)
        if not (ideal_height_min <= height_cm <= ideal_height_max + 10):
            response = jsonify({
                "error": f"Height must be between {ideal_height_min} and {ideal_height_max + 10} cm"
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        if not (ideal_weight_min <= weight_kg <= ideal_weight_max + 3):
            response = jsonify({
                "error": f"Weight must be between {ideal_weight_min} and {ideal_weight_max + 3} kg"
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        # Determine status
        if height_cm < ideal_height_min:
            height_status = "below the ideal range"
        elif height_cm > ideal_height_max:
            height_status = "above the ideal range"
        else:
            height_status = "within the ideal range"

        if weight_kg < ideal_weight_min:
            weight_status = "below the ideal range"
        elif weight_kg > ideal_weight_max:
            weight_status = "above the ideal range"
        else:
            weight_status = "within the ideal range"

        # Insert into DB
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tblcgm (cgmchildid,cgmheightcm, cgmweightkg)
                VALUES (%s, %s, %s)
            """, (child_id, height_cm, weight_kg))
            conn.commit()

        # Generate recommendation
        recommendation = ""
        if height_status != "within the ideal range" or weight_status != "within the ideal range":
            prompt_parts = [
                "You are a compassionate Early Childhood Development expert, specializing in infant growth for parents in India.",
                f"A parent is concerned about their child, {name} (age: {age_months} months, height: {height_cm} cm, weight: {weight_kg} kg).",
                "The child's measurements are outside the typical range."
            ]
            if height_status == "below the ideal range":
                prompt_parts.append(
                    f"Specifically, {name}'s height is a bit below the ideal range for a child of this age ({ideal_height_min}-{ideal_height_max} cm)."
                )
            elif height_status == "above the ideal range":
                prompt_parts.append(
                    f"Specifically, {name}'s height is a bit above the ideal range for a child of this age ({ideal_height_min}-{ideal_height_max} cm)."
                )
            if weight_status == "below the ideal range":
                prompt_parts.append(
                    f"And {name}'s weight is a bit below the ideal range for this age ({ideal_weight_min}-{ideal_weight_max} kg)."
                )
            elif weight_status == "above the ideal range":
                prompt_parts.append(
                    f"And {name}'s weight is a bit above the ideal range for this age ({ideal_weight_min}-{ideal_weight_max} kg)."
                )
            prompt_parts.append(
                "Please provide a simple short, empathetic, and actionable suggestion for the parent on what to do "
                "to help the child maintain or reach ideal height and weight. Keep the response concise (30-40 words)."
            )
            gemini_prompt = " ".join(prompt_parts)

            try:
                gemini_response = model.generate_content(gemini_prompt)
                recommendation = gemini_response.text.strip()
            except Exception as gemini_e:
                print(f"Gemini API error: {gemini_e}")
                traceback.print_exc()
                recommendation = (
                    "We're unable to generate a personalized recommendation right now. "
                    "Please consult your pediatrician for a detailed assessment and guidance."
                )
        else:
            recommendation = (
                f"That's wonderful! Based on the information provided, {name}'s height and weight are within "
                f"a healthy range for a {age_months}-month-old baby. Keep up the great work with their feeding and "
                "regular pediatric check-ups. Consistent growth is key!"
            )

        response = jsonify({
            "age_months": age_months,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "height_status": height_status,
            "weight_status": weight_status,
            "recommendation": recommendation,
            "ideal_height_min": ideal_height_min,
            "ideal_height_max": ideal_height_max,
            "ideal_weight_min": ideal_weight_min,
            "ideal_weight_max": ideal_weight_max,
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    except Exception as e:
        traceback.print_exc()
        response = jsonify({"error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500
    finally:
        if conn:
            conn.close()

@chatbot_bp.route("/child_assessments", methods=["GET"])
def get_child_assessments():
    child_id = request.args.get("id")

    if not child_id:
        return jsonify({"error": "Child ID is required to fetch assessments"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT cgmheightcm, cgmweightkg, cgmdate
                FROM tblcgm
                WHERE cgmchildid = %s
                ORDER BY cgmdate DESC
            """, (child_id,))

            results = cursor.fetchall()
            assessments = [{"height_cm": row[0], "weight_kg": row[1],"assessment_date": str(row[2])} for row in results] # Ensure date is string

        response = jsonify(assessments)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        print(f"❌ Error in get_child_assessments for child_id {child_id}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to retrieve assessments"}), 500
    finally:
        if conn:
            conn.close()

# --- Parent Name Endpoint (Modified to use get_db_connection) ---

@chatbot_bp.route("/get_parent_name", methods=["POST"])
def get_parent_name():
    data = request.json
    phone = data.get("phone")
    print(f"Received phone number for parent name: {phone}")

    if not phone:
        print("Phone number missing from request.")
        return jsonify({"error": "Phone number is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT userparentname FROM tblusers WHERE userphoneno = %s",
                (phone,)
            )
            user = cursor.fetchone()
            print(f"Database query result (user): {user}")

        if user:
            parent_name = user.get("userparentname")
            print(f"Fetched parent name from DB: {parent_name}")
            return jsonify({"parent_name": parent_name})
        else:
            print(f"No user found for phone number: {phone}")
            return jsonify({"parent_name": None})

    except Exception as e:
        print(f"❌ Error in get_parent_name for phone {phone}: {e}")
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# --- Doctor Endpoints (Modified to use get_db_connection) ---

@chatbot_bp.route("/doctors", methods=["GET"])
def get_available_doctors():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT doctor_id, doctor_name, email_id, phone_number
                FROM doctor
            """)
            doctors = cursor.fetchall()
        return jsonify(doctors)
    except Exception as e:
        print(f"❌ Error in get_available_doctors: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@chatbot_bp.route("/doctor_chat", methods=["POST"])
def doctor_chat():
    conn = None
    try:
        data = request.json
        parent_id = data.get("parent_id")
        doctor_id = data.get("doctor_id")
        message = data.get("message")
        is_doctor = data.get("is_doctor", False)

        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                INSERT INTO doctor_chat (parent_id, doctor_id, message, is_doctor)
                VALUES (%s, %s, %s, %s)
            """, (parent_id, doctor_id, message, is_doctor))
            conn.commit()

            cursor.execute("""
                SELECT created_at FROM doctor_chat
                WHERE id = LAST_INSERT_ID()
            """)
            result = cursor.fetchone()
            timestamp = result['created_at'].strftime("%Y-%m-%d %H:%M:%S") if result else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({
            "status": "success",
            "timestamp": timestamp
        })
    except Exception as e:
        print(f"❌ Error in doctor_chat for parent {parent_id}, doctor {doctor_id}: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@chatbot_bp.route("/doctor_chat_history", methods=["POST"])
def get_doctor_chat_history():
    conn = None
    try:
        data = request.json
        parent_id = data.get("parent_id")
        doctor_id = data.get("doctor_id")

        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT message, is_doctor, created_at
                FROM doctor_chat
                WHERE parent_id = %s AND doctor_id = %s
                ORDER BY created_at ASC
            """, (parent_id, doctor_id))
            history = cursor.fetchall()

        formatted_history = []
        for h in history:
            formatted_history.append({
                "sender": "Doctor" if h['is_doctor'] else "You",
                "message": h['message'],
                "timestamp": h['created_at'].strftime("%Y-%m-%d %H:%M:%S")
            })

        return jsonify({
            "history": formatted_history
        })
    except Exception as e:
        print(f"❌ Error in get_doctor_chat_history for parent {parent_id}, doctor {doctor_id}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- Notification Endpoints (Modified to use get_db_connection) ---

@chatbot_bp.route('/notifications/<doctor_phone>', methods=['GET'])
def get_notifications(doctor_phone):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            # Assuming 'notifications' table exists and stores doctor_phone
            # If notifications are linked via doctor_id, you'd need a JOIN or a prior lookup
            cursor.execute("""
                SELECT child_id, child_name, parent_name, timestamp
                FROM notifications
                WHERE doctor_phone = %s
                ORDER BY timestamp DESC
            """, (doctor_phone,))
            notifications = cursor.fetchall()
        return jsonify(notifications)
    except Exception as e:
        print(f"❌ Error fetching notifications for doctor_phone {doctor_phone}: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

from datetime import datetime, timedelta

@chatbot_bp.route('/create_chat_notification', methods=['POST'])
def create_chat_notification():
    conn = None
    try:
        data = request.get_json()
        child_id = data['child_id']
        doctor_id = data['doctor_id']

        # Current UTC time
        utc_now = datetime.utcnow()

        # IST is UTC + 5 hours 30 minutes
        ist_offset = timedelta(hours=5, minutes=30)
        ist_now = utc_now + ist_offset  # convert to IST

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tblchatnotification
                (
                    chatnotichildid,
                    chatnotidoctorid,
                    chatnotiseenbydoctor,
                    chatnotiactionatkenbydoctor,
                    createddate
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (child_id, doctor_id, "no", "no", ist_now))
            conn.commit()

        return jsonify({"status": "success", "message": "Notification created"}), 201

    except Exception as e:
        print(f"❌ Failed to create chat notification: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        if conn:
            conn.close()


@chatbot_bp.route('/chatbot/notifications/<doctor_id>', methods=['GET'])
def get_chat_notifications(doctor_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT
                    chatnotichildid AS child_id,
                    createddate AS timestamp,
                    chatnotiseenbydoctor,
                    chatnotiactionatkenbydoctor
                FROM tblchatnotification
                WHERE chatnotidoctorid = %s
                ORDER BY createddate DESC
            """, (doctor_id,))
            raw_notifications = cursor.fetchall()

        # Explicitly convert datetime to ISO 8601 string
        notifications = []
        for notif in raw_notifications:
            if isinstance(notif["timestamp"], datetime):
                notif["timestamp"] = notif["timestamp"].isoformat()
            notifications.append(notif)

        return jsonify(notifications)

    except Exception as e:
        print(f"❌ Error fetching chat notifications for doctor {doctor_id}: {e}")
        traceback.print_exc()
        return jsonify([]), 500
    finally:
        if conn:
            conn.close()



@chatbot_bp.route('/chatbot/mark_seen', methods=['POST'])
def mark_notification_seen():
    data = request.json
    conn = None
    try:
        child_id = data['child_id']
        doctor_id = data['doctor_id']
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE tblchatnotification
                SET chatnotiseenbydoctor = 'yes', chatnotiactionatkenbydoctor = 'yes'
                WHERE chatnotichildid = %s AND chatnotidoctorid = %s
            """, (child_id, doctor_id))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"❌ Error updating notification status for child {child_id}, doctor {doctor_id}: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()

@chatbot_bp.route('/doctor_name/<phone>', methods=['GET'])
def get_doctor_name(phone):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT doctor_name FROM doctor WHERE phone_number = %s", (phone,))
            result = cursor.fetchone()
        return jsonify(result or {})
    except Exception as e:
        print(f"❌ Error fetching doctor name for phone {phone}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
from flask import jsonify, request
from datetime import datetime
import traceback

# Your existing imports and setup assumed...

@chatbot_bp.route('/child/info/<child_id>', methods=['GET'])
def get_child_info(child_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT childname, childgender, childdateofbirth
                FROM tblchildinfo
                WHERE childid = %s
            """, (child_id,))
            child = cursor.fetchone()

            if not child:
                return jsonify({"error": "Child not found"}), 404

            dob = child.get('childdateofbirth')
            if dob:
                if isinstance(dob, str):
                    dob = datetime.strptime(dob, "%Y-%m-%d").date()
                today = datetime.now().date()
                age = relativedelta(today, dob)
                age_string = f"{age.months} m {age.days} d"
            else:
                age_string = "Unknown"

            response = {
                "name": child['childname'],
                "age": age_string,
                "gender": child['childgender'],
                "dateOfBirth": dob.isoformat() if dob else None
            }
            return jsonify(response)

    except Exception as e:
        print(f"❌ Error fetching child info for child {child_id}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
from datetime import datetime, timedelta

@chatbot_bp.route('/notification/action_taken', methods=['POST']) 
def update_action_taken():
    data = request.get_json()
    child_id = data.get("child_id")
    doctor_id = data.get("doctor_id")
    final_waiting_time = data.get("final_waiting_time")

    # Get current IST time
    utc_now = datetime.utcnow()
    ist_offset = timedelta(hours=5, minutes=30)
    ist_now = utc_now + ist_offset

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE tblchatnotification
                SET chatnotiactionatkenbydoctor = 'yes',
                    final_waiting_time = %s,
                    action_time = %s
                WHERE chatnotichildid = %s AND chatnotidoctorid = %s
            """, (final_waiting_time, ist_now, child_id, doctor_id))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print(f"❌ Error updating action_taken: {e}")
        return jsonify({"success": False}), 500
    finally:
        if conn:
            conn.close()


@chatbot_bp.route('/notification/mark_seen', methods=['POST'])
def update_seen():
    data = request.get_json()
    child_id = data.get("child_id")
    doctor_id = data.get("doctor_id")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE tblchatnotification
                SET chatnotiseenbydoctor = 'yes'
                WHERE chatnotichildid = %s AND chatnotidoctorid = %s
            """, (child_id, doctor_id))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print(f"❌ Error updating seen status: {e}")
        return jsonify({"success": False}), 500
    finally:
        if conn:
            conn.close()
@chatbot_bp.route('/notification/action_status/<doctor_id>', methods=['GET'])
def get_action_status(doctor_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT 
                    chatnotiid,
                    chatnotichildid,
                    chatnotiactionatkenbydoctor,
                    action_time
                FROM tblchatnotification
                WHERE chatnotidoctorid = %s
            """, (doctor_id,))
            rows = cursor.fetchall()

        return jsonify(rows), 200
    except Exception as e:
        print(f"❌ Error fetching action status: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
    finally:
        if conn:
            conn.close()
@chatbot_bp.route('/update_last_action/<doctor_id>', methods=['POST'])
def update_last_action(doctor_id):
    data = request.get_json()
    available = data.get("available", True)  # Default to True if not passed

    utc_now = datetime.utcnow()
    ist_now = utc_now + timedelta(hours=5, minutes=30)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO login_sessions (doctor_id, last_action_time, available)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    last_action_time = VALUES(last_action_time),
                    available = VALUES(available)
            """, (doctor_id, ist_now, available))

            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print(f"❌ Error updating last action: {e}")
        return jsonify({"success": False}), 500
    finally:
        if conn:
            conn.close()


@chatbot_bp.route('/doctor/availability/<doctor_id>', methods=['GET'])
def get_doctor_availability(doctor_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT last_action_time
                FROM login_sessions
                WHERE doctor_id = %s
            """, (doctor_id,))
            row = cursor.fetchone()

        if not row:
            return jsonify({"available": False}), 200

        last_action = row["last_action_time"]
        current_time = datetime.utcnow() + timedelta(hours=5, minutes=30)
        delta = current_time - last_action
        is_online = delta.total_seconds() < 5  # 5 minutes

        return jsonify({
            "available": is_online,
            "last_action_time": last_action.isoformat()
        }), 200
    except Exception as e:
        print(f"❌ Error fetching availability: {e}")
        return jsonify({"available": False}), 500
    finally:
        if conn:
            conn.close()
