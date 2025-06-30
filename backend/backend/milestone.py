from flask import request, jsonify, Blueprint
import re
import traceback
import mysql.connector
from deep_translator import GoogleTranslator
import google.generativeai as genai

milestone_bp = Blueprint('milestone', __name__)

# Configure Gemini model
genai.configure(api_key="AIzaSyDt7Bfz1nvkLdCK4nogYtNg3kMBDB0xRlI")  # Replace with your valid API key
model = genai.GenerativeModel("gemini-2.0-flash-lite")

def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database='shishuvrridhhidb'
    )

def translate_text(text, target_lang):
    """
    Translate English text into target_lang using GoogleTranslator.
    Falls back to original if translation fails.
    """
    if not target_lang or target_lang == 'en':
        return text
    try:
        return GoogleTranslator(source='en', target=target_lang).translate(text)
    except Exception as e:
        print(f"Translation failed: {e}")
        return text

@milestone_bp.route('/get_milestones', methods=['POST'])
def get_milestones():
    try:
        data = request.json
        name = data.get("name")
        age = data.get("age")
        phone = data.get("phone")
        childid = data.get("childid")
        language = data.get("language", "en")  # Default to English

        prompt = (
            f"You are a child development expert chatbot.\n"
            f"List 5 important developmental milestones for a {age}-month-old baby. "
            "For each one, write it as a short, clear and supportive question a pediatrician might ask a parent during a routine visit. "
            "Keep the language simple, warm, and easy to answer with 'Yes', 'No', or 'Don't Know'. "
            "Number each question (e.g., 1. … 2. …)"
        )

        def clean_and_extract_question(line):
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
            return line.strip(' "“”').strip()

        response = model.generate_content(prompt)
        lines = response.text.strip().split('\n')
        questions = [clean_and_extract_question(line) for line in lines if '?' in line]

        translated = [translate_text(q, language) for q in questions]

        conn = get_db_connection()
        cursor = conn.cursor()
        for q in questions:
            cursor.execute("""
                INSERT INTO tblmilestones (milstoneidchildid, milestonequestion, milestoneanswer, craeteddate)
                VALUES (%s, %s, %s, NOW())
            """, (childid, q, None))
        conn.commit()
        conn.close()

        return jsonify({"milestones": translated})

    except Exception as e:
        print("❌ Error in /get_milestones:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@milestone_bp.route('/submit_milestones', methods=['POST'])
def submit_milestones():
    try:
        data = request.json
        childid = data.get("childid")
        answers = data.get("answers")
        name = data.get("name")
        age = data.get("age")
        language = data.get("language", "en")  # <-- Get language from frontend

        conn = get_db_connection()
        cursor = conn.cursor()
        for item in answers:
            cursor.execute("""
                INSERT INTO tblmilestones (milstoneidchildid, milestonequestion, milestoneanswer, craeteddate)
                VALUES (%s, %s, %s, NOW())
            """, (childid, item["question"], item["answer"]))
        conn.commit()

        cursor.execute("""
            SELECT milestonequestion, milestoneanswer, craeteddate
            FROM tblmilestones
            WHERE milstoneidchildid = %s AND milestoneanswer IS NOT NULL
        """, (childid,))
        all_answers = cursor.fetchall()
        conn.close()

        recent = sorted(all_answers, key=lambda x: x[2], reverse=True)[:5]
        num_no = sum(1 for row in recent if row[1].strip().lower() == "no")
        num_dk = sum(1 for row in recent if row[1].strip().lower() == "don't know")

        if num_no == 0 and num_dk <= 1:
            concern_en = "Your child appears to be developing normally for their age."
        elif num_no <= 2:
            concern_en = "Your child may be slightly behind on some milestones. It’s okay to wait and watch, but if you're concerned, consult a pediatrician."
        else:
            concern_en = "Several milestones were not met. It is recommended to consult a pediatrician for further evaluation."

        concern = translate_text(concern_en, language)

        full_summary = "\n".join([f"Q: {row[0]}\nA: {row[1]}" for row in all_answers])
        prompt = (
            f"You are an early childhood development expert.\n\n"
            f"A parent has answered milestone screening questions about their {age}-month-old child named {name}. "
            f"Based on all the answers below, give 3–4 warm, simple, overall recommendations to help support the child’s growth. "
            f"Make the advice easy for any parent to follow at home. "
            f"Keep the total response between 50 and 80 words. "
            f"Don't write one recommendation per question — instead, give general advice based on the overall answers.\n\n"
            f"{full_summary}\n\n"
            f"Recommendations:"
        )

        response = model.generate_content(prompt)
        recommendations_en = response.text.strip()
        recommendations = translate_text(recommendations_en, language)

        return jsonify({
            "message": "Responses saved successfully.",
            "recommendation": recommendations,
            "concern": concern
        })

    except Exception as e:
        print("❌ Error in /submit_milestones:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@milestone_bp.route('/get_milestone_responses', methods=['POST'])
def get_milestone_responses():
    try:
        data = request.json
        childid = data.get("childid")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT milestonequestion, milestoneanswer, craeteddate
            FROM tblmilestones
            WHERE milstoneidchildid = %s AND milestoneanswer IS NOT NULL
            ORDER BY craeteddate ASC
        """, (childid,))
        rows = cursor.fetchall()
        conn.close()

        grouped = {}
        for row in rows:
            grouped.setdefault(row["milestonequestion"], []).append({
                "answer": row["milestoneanswer"],
                "timestamp": row["craeteddate"].strftime("%Y-%m-%d")
            })

        return jsonify({"milestone_responses": grouped})

    except Exception as e:
        print("❌ Error in /get_milestone_responses:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
