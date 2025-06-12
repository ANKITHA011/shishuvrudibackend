import os
import base64
import tempfile
import json
from flask import Blueprint, request, jsonify
import google.generativeai as genai
import redis
import mysql.connector
from langdetect import detect
from deep_translator import GoogleTranslator
from gtts import gTTS
from datetime import datetime, timedelta

chatbot_bp = Blueprint("chatbot", __name__)

# Configure Gemini API
genai.configure(api_key="AIzaSyDO-nvH8fpcmru_FE61V9gpsU-nDOwaVko")
model = genai.GenerativeModel("gemini-1.5-flash-latest")

# Redis setup
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)

# MySQL setup
conn = mysql.connector.connect(
    host="localhost", user="root", password="root", database="chat_history"
)

#translator = Translator()

def detect_lang(text):
    try:
        return detect(text)
    except:
        return 'en'

from deep_translator import GoogleTranslator

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
        return None

def get_history(name, age, phone):

    with conn.cursor(dictionary=True) as cursor:
        cursor.execute("""
            SELECT role, content, timestamp
            FROM chat_history2
            WHERE name=%s AND phone=%s
            ORDER BY timestamp ASC
        """, (name.lower(), phone))
        history = cursor.fetchall()

    for h in history:
        if isinstance(h['timestamp'], datetime):
            h['timestamp'] = h['timestamp'].strftime("%Y-%m-%d %H:%M:%S")
    return history

def save_message(name, age, phone, role, content):
    with conn.cursor(dictionary=True) as cursor:
        cursor.execute("""
            INSERT INTO chat_history2 (name, age, phone, role, content)
            VALUES (%s, %s, %s, %s, %s)
        """, (name.lower(), age, phone, role, content))
        conn.commit()

        cursor.execute("""
            SELECT timestamp FROM chat_history2
            WHERE name=%s AND age=%s AND phone=%s AND role=%s AND content=%s
            ORDER BY id DESC LIMIT 1
        """, (name.lower(), age, phone, role, content))
        result = cursor.fetchone()

    timestamp = result['timestamp'].strftime("%Y-%m-%d %H:%M:%S") if result else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

"""
@chatbot_bp.route("/respond", methods=["POST"])
def chatbot_response():
    try:
        data = request.json
        message = data.get("message")
        age = data.get("age")
        gender = data.get("gender")
        name = data.get("name")
        phone = data.get("phone")

        if message == "__load_history__":
            history = get_history(name, age, phone)
            return jsonify({"history": history})

        if message == "__load_history__preview__":
            history = get_history(name, age, phone)
            if not history:
                return jsonify({"preview": None})
            full_text = " ".join([msg["content"] for msg in history])
            preview_words = " ".join(full_text.split()[:40]) + "..."
            return jsonify({"preview": preview_words})

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

            translated_input, lang = translate_to_en(conversation_context[:100])
            final_response = translate_from_en(summary_response, lang)

            audio = generate_audio(final_response, lang)

            return jsonify({
                "response": final_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "audio": audio
            })

        translated_input, lang = translate_to_en(message)
        save_message(name, age, phone, 'user', message)

        history = get_history(name, age, phone)
        conversation_history = ""
        for h in history:
            role = "Parent" if h["role"] == "user" else "ECD Expert"
            conversation_history += f"{role}: {h['content']}\n"

        prompt = (
            f"You are a certified Early Childhood Development expert and pediatric consultant. \n"
            f"A parent is asking about their {age}-month-old {gender} child named {name}.\n"
            f"Provide helpful, simple, age-appropriate guidance.\n\n"
            "Provide a warm, evidence-based response that:\n"
            "- Addresses their specific concern with empathy\n"
            "- Offers practical, actionable advice\n",
            "- Suggests when to consult a pediatrician if relevant\n"
            "- remember the parent and child are from India"
            "- Uses encouraging, supportive language\n\n"
            f"limit the response to 50-100 words"
            f"{conversation_history}"
            f"Parent: {translated_input}\n"
            f"ECD Expert:"
        )

        response = model.generate_content(prompt)
        bot_response_en = response.text.strip()
        bot_response = translate_from_en(bot_response_en, lang)

        save_message(name, age, phone, 'model', bot_response)
        audio = generate_audio(bot_response, lang)

        return jsonify({
            "response": bot_response,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "audio": audio
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
"""



@chatbot_bp.route("/respond", methods=["POST"])
def chatbot_response():
    try:
        data = request.json
        message = data.get("message")
        age = data.get("age")
        gender = data.get("gender")
        name = data.get("name")
        phone = data.get("phone")

        # Load full chat history
        if message == "__load_history__":
            history = get_history(name, age, phone)
            return jsonify({"history": history})

        # Generate a short summary (max 50 words) of chat history
        if message == "__load_history__preview__":
            history = get_history(name, age, phone)
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

        # Generate a welcome message with summary of past conversation
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

            translated_input, lang = translate_to_en(conversation_context[:100])
            final_response = translate_from_en(summary_response, lang)

            audio = generate_audio(final_response, lang)

            return jsonify({
                "response": final_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "audio": audio
            })

        # Normal user message handling
        translated_input, lang = translate_to_en(message)
        save_message(name, age, phone, 'user', message)

        history = get_history(name, age, phone)
        conversation_history = ""
        for h in history:
            role = "Parent" if h["role"] == "user" else "ECD Expert"
            conversation_history += f"{role}: {h['content']}\n"

        prompt = (
            f"You are a certified Early Childhood Development expert and pediatric consultant.\n"
            f"A parent is asking about their {age}-month-old {gender} child named {name}.\n"
            f"Provide helpful, simple, age-appropriate guidance.\n\n"
            "Provide a evidence-based response that:\n"
            "- Addresses their specific concern with empathy\n"
            "- Offers practical, actionable advice\n"
            "- Suggests when to consult a pediatrician if relevant\n"
            "- Remember the parent and child are from India\n"
            "- Uses encouraging, supportive language\n\n"
            "-response should be point wise not a paragragh and easy to understand next point should begin in a new line\n"
            f"Limit the response to 50-100 words\n"
            f"{conversation_history}"
            f"Parent: {translated_input}\n"
            f"ECD Expert:"
        )

        response = model.generate_content(prompt)
        bot_response_en = response.text.strip()
        bot_response = translate_from_en(bot_response_en, lang)

        save_message(name, age, phone, 'model', bot_response)
        audio = generate_audio(bot_response, lang)

        return jsonify({
            "response": bot_response,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "audio": audio
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

from flask import request, jsonify
from datetime import datetime
#from your_db_connection import conn  # Replace with your actual DB connection import

@chatbot_bp.route("/children", methods=["POST"])
def get_registered_children():
    data = request.json
    phone = data.get("phone")
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT id, name, gender, date_of_birth
                FROM child_info1
                WHERE phone = %s
            """, (phone,))
            children_data = cursor.fetchall()

        today = datetime.now().date()
        children = []

        for child in children_data:
            dob = child.get("date_of_birth")
            if dob:
                # Convert to date if necessary
                if isinstance(dob, str):
                    dob = datetime.strptime(dob, "%Y-%m-%d").date()

                # Calculate age in months
                age_in_months = (today.year - dob.year) * 12 + (today.month - dob.month)
                if today.day < dob.day:
                    age_in_months -= 1
            else:
                age_in_months = None

            children.append({
                "id": child["id"],
                "name": child["name"],
                "gender": child["gender"],
                "age": age_in_months
            })

        return jsonify(children)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chatbot_bp.route("/children/<int:child_id>", methods=["DELETE"])
def delete_child(child_id):
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("DELETE FROM child_info1 WHERE id = %s", (child_id,))
            conn.commit()
        return jsonify({"message": "Child deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chatbot_bp.route("/children/<int:child_id>", methods=["PUT"])
def update_child(child_id):
    data = request.json
    name = data.get("name")
    age = data.get("age") # This 'age' is received as months
    gender = data.get("gender")

    updates = []
    params = []

    if name:
        updates.append("name = %s")
        params.append(name)

    if gender:
        updates.append("gender = %s")
        params.append(gender)

    if age is not None:
        # Convert age in months back to a date_of_birth for the database
        today = datetime.today().date()
        # Approximate average days in a month to subtract
        approx_days_in_month = 30.437
        days_to_subtract = age * approx_days_in_month
        date_of_birth = today - timedelta(days=days_to_subtract)
        updates.append("date_of_birth = %s")
        params.append(date_of_birth) # Store as date object

    params.append(child_id)

    try:
        with conn.cursor(dictionary=True) as cursor:
            sql = f"UPDATE child_info1 SET {', '.join(updates)} WHERE id = %s"
            cursor.execute(sql, tuple(params))
            conn.commit()
        return jsonify({"message": "Child updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
from flask import request, jsonify
import re

@chatbot_bp.route('/get_milestones', methods=['POST'])
def get_milestones():
    data = request.json
    name = data.get("name")
    age = data.get("age")
    phone = data.get("phone")

    # Use this prompt to get questions in the right format
    prompt = (
        "You are a child development expert chatbot.\n"
        f"List 5 important developmental milestones for a {age}-month-old baby. "
        "For each one, write it as a short,clear and supportive question a pediatrician might ask a parent during a routine visit. "
        "Keep the language simple, warm, and easy to answer with 'Yes', 'No', or 'Don't Know'. "
        "Number each question (e.g., 1. … 2. …)"
    )

    def clean_and_extract_question(line):
        # Remove leading number (e.g., "1. ", "2)")
        line = re.sub(r'^\d+[\.\)]\s*', '', line)
        # Remove bolded headers like "**Eye Contact:**"
        line = re.sub(r'\*\*[^:*]+:\*\*', '', line)
        # Remove quotes around the question
        line = line.strip(' "“”')
        return line.strip()

    try:
        # Generate milestone questions using the model
        response = model.generate_content(prompt)
        lines = response.text.strip().split('\n')

        # Clean and filter only proper question lines
        milestones = [clean_and_extract_question(line) for line in lines if '?' in line]

        # Save to DB
        cursor = conn.cursor()
        for question in milestones:
            cursor.execute("""
                INSERT INTO milestones (name, age, phone, question, answer, timestamp)
                VALUES (%s, %s, %s, %s, NULL, NOW())
            """, (name, age, phone, question))
        conn.commit()

        return jsonify({"milestones": milestones})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
import traceback

@chatbot_bp.route('/submit_milestones', methods=['POST'])
def submit_milestones():
    data = request.json
    name = data.get("name")
    age = data.get("age")
    phone = data.get("phone")
    answers = data.get("answers")

    try:
        cursor = conn.cursor()
        for item in answers:
            cursor.execute("""
                UPDATE milestones
                SET answer = %s, timestamp = NOW()
                WHERE name = %s AND age = %s AND phone = %s AND question = %s
            """, (item["answer"], name, age, phone, item["question"]))
        conn.commit()

        # ✅ Fetch ALL answered milestones from DB (past + new)
        cursor.execute("""
            SELECT question, answer FROM milestones
            WHERE name = %s AND phone = %s AND answer IS NOT NULL
        """, (name, phone))
        all_answers = cursor.fetchall()


        # Build summary
        summary = "\n".join([f"Q: {row[0]}\nA: {row[1]}" for row in all_answers])

        num_no = sum(1 for row in all_answers if row[1].strip().lower() == "no")
        num_dk = sum(1 for row in all_answers if row[1].strip().lower() == "don't know")

        if num_no == 0 and num_dk <= 1:
            concern = "Your child appears to be developing normally for their age."
        elif num_no <= 2:
            concern = "Your child may be slightly behind on some milestones. It’s okay to wait and watch, but if you're concerned, consult a pediatrician."
        else:
            concern = "Several milestones were not met. It is recommended to consult a pediatrician for further evaluation."

        # Prompt for Gemini
        prompt = (
            f"You are an early childhood development expert.\n\n"
            f"A parent has answered milestone screening questions about their {age}-month-old child named {name}. "
            f"Based on all the answers below, give 3–4 warm, simple, overall recommendations to help support the child’s growth. "
            f"Make the advice easy for any parent to follow at home. "
            f"Keep the total response between 50 and 80 words. "
            f"Don't write one recommendation per question — instead, give general advice based on the overall answers.\n\n"
            f"{summary}\n\n"
            f"Recommendations:"
        )

        print("Prompt to Gemini:\n", prompt)  # Debug prompt

        response = model.generate_content(prompt)
        recommendations = response.text.strip()

        return jsonify({
            "message": "Responses saved successfully.",
            "recommendation": recommendations,
            "concern": concern
        })

    except Exception as e:
        print("Error in /submit_milestones:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@chatbot_bp.route('/get_milestone_responses', methods=['POST'])
def get_milestone_responses():
    data = request.json
    name = data.get("name")
    phone = data.get("phone")

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT question, answer, timestamp
            FROM milestones
            WHERE name = %s AND phone = %s AND answer IS NOT NULL
            ORDER BY timestamp ASC
        """, (name, phone))
        rows = cursor.fetchall()
        grouped = {}
        for row in rows:
            q = row["question"]
            if q not in grouped:
                grouped[q] = []
            grouped[q].append({
                "answer": row["answer"],
                "timestamp": row["timestamp"].strftime("%Y-%m-%d")
            })

        return jsonify({"milestone_responses": grouped})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chatbot_bp.route("/get_parent_name", methods=["POST"])
def get_parent_name():
    data = request.json
    phone = data.get("phone")
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT parent_name FROM users WHERE phone = %s", (phone,))
            user = cursor.fetchone()

        if user:
            return jsonify({"parent_name": user["parent_name"]}) # Changed 'name' to 'parent_name'
        else:
            return jsonify({"parent_name": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



from flask import Blueprint, request, jsonify
import traceback
# Assuming 'conn' and 'get_ideal_ranges' and 'model' (for Gemini) are imported/defined elsewhere


def get_ideal_ranges(age_months, gender=None):
    # Simplified ideal ranges, modify as needed
    if 0 <= age_months <= 3:
        return {"height_min": 45, "height_max": 65, "weight_min": 2.5, "weight_max": 7}
    elif 4 <= age_months <= 6:
        return {"height_min": 55, "height_max": 75, "weight_min": 5, "weight_max": 9.5}
    elif 7 <= age_months <= 9:
        return {"height_min": 60, "height_max": 80, "weight_min": 6.5, "weight_max": 11}
    elif 10 <= age_months <= 12:
        return {"height_min": 65, "height_max": 85, "weight_min": 7.5, "weight_max": 12.5}
    else:
        return {"height_min": 40, "height_max": 85, "weight_min": 2, "weight_max": 15}



@chatbot_bp.route("/child_assessment", methods=["POST", "OPTIONS"])
def child_assessment():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response

    try:
        data = request.get_json()
        if data is None:
            response = jsonify({"error": "Invalid or missing JSON in request"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        name = data.get("name", "the child")
        phone = data.get("phone")
        gender = data.get("gender")  # optional
        try:
            age_months = int(data.get("age"))
            height_cm = float(data.get("height"))
            weight_kg = float(data.get("weight"))
        except (TypeError, ValueError):
            response = jsonify({"error": "Invalid input types for age, height, or weight"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        # Validate required fields
        if not phone:
            response = jsonify({"error": "Phone number is required"})
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
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO child_measurements (name, phone, height_cm, weight_kg)
                VALUES (%s, %s, %s, %s)
            """, (name, phone, height_cm, weight_kg))
            conn.commit()
            cursor.close()
        except Exception as db_error:
            print(f"DB insert error: {db_error}")
            response = jsonify({"error": "Database insert failed"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 500

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
                "to help the child maintain or reach ideal height and weight. Keep the response concise (50-100 words)."
            )
            gemini_prompt = " ".join(prompt_parts)

            try:
                gemini_response = model.generate_content(gemini_prompt)
                recommendation = gemini_response.text.strip()
            except Exception as gemini_e:
                print(f"Gemini API error: {gemini_e}")
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

@chatbot_bp.route("/child_assessments", methods=["GET"])
def get_child_assessments():
    phone = request.args.get("phone")
    name = request.args.get("name")

    if not phone or not name:
        return jsonify({"error": "Both phone and name are required"}), 400

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT height_cm, weight_kg,assessment_date
            FROM child_measurements
            WHERE phone = %s AND name = %s
            ORDER BY assessment_date DESC
        """, (phone, name))

        results = cursor.fetchall()
        assessments = [{"height_cm": row[0], "weight_kg": row[1],"assessment_date": row[2]} for row in results]

        cursor.close()

        response = jsonify(assessments)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to retrieve assessments"}), 500
