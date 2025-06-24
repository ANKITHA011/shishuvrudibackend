from flask import request, jsonify, Blueprint
import re
import traceback
import mysql.connector
import google.generativeai as genai

# Define your blueprint if not already
milestone_bp = Blueprint('milestone', __name__)
genai.configure(api_key="AIzaSyDO-nvH8fpcmru_FE61V9gpsU-nDOwaVko")
model = genai.GenerativeModel("gemini-1.5-flash-latest")
# ✅ DB Connection helper
def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',      # ⬅️ replace with actual MySQL username
        password='root',  # ⬅️ replace with actual MySQL password
        database='shishuvrridhhidb'   # ⬅️ replace with actual DB name
    )

@milestone_bp.route('/get_milestones', methods=['POST'])
def get_milestones():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing or invalid JSON body"}), 400

        name = data.get("name")
        age = data.get("age")
        phone = data.get("phone")
        childid = data.get("childid")

        prompt = (
            "You are a child development expert chatbot.\n"
            f"List 5 important developmental milestones for a {age}-month-old baby. "
            "For each one, write it as a short, clear and supportive question a pediatrician might ask a parent during a routine visit. "
            "Keep the language simple, warm, and easy to answer with 'Yes', 'No', or 'Don't Know'. "
            "Number each question (e.g., 1. … 2. …)"
        )

        def clean_and_extract_question(line):
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
            line = re.sub(r'\*\*[^:*]+:\*\*', '', line)
            return line.strip(' "“”').strip()

        print("Prompt sent to model:", prompt)
        response = model.generate_content(prompt)
        print("Model response:", response)

        lines = response.text.strip().split('\n')
        milestones = [clean_and_extract_question(line) for line in lines if '?' in line]

        conn = get_db_connection()
        cursor = conn.cursor()
        for question in milestones:
            cursor.execute("""
                INSERT INTO tblmilestones (milstoneidchildid, milestonequestion, milestoneanswer, craeteddate)
                VALUES (%s, %s, %s, NOW())
            """, (childid, question, None))
        conn.commit()
        conn.close()

        return jsonify({"milestones": milestones})

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

        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert new rows instead of update
        for item in answers:
            cursor.execute("""
                INSERT INTO tblmilestones (milstoneidchildid, milestonequestion, milestoneanswer, craeteddate)
                VALUES (%s, %s, %s, NOW())
            """, (childid, item["question"], item["answer"]))

        conn.commit()

        # Now fetch all answers as you were doing before
        cursor.execute("""
            SELECT milestonequestion, milestoneanswer, craeteddate
            FROM tblmilestones
            WHERE milstoneidchildid = %s AND milestoneanswer IS NOT NULL
        """, (childid,))
        all_answers = cursor.fetchall()
        conn.close()

        # Sort by date DESC and take only the most recent 5 answers
        recent_answers = sorted(all_answers, key=lambda x: x[2], reverse=True)[:5]

        summary = "\n".join([f"Q: {row[0]}\nA: {row[1]}" for row in recent_answers])
        num_no = sum(1 for row in recent_answers if row[1].strip().lower() == "no")
        num_dk = sum(1 for row in recent_answers if row[1].strip().lower() == "don't know")

        if num_no == 0 and num_dk <= 1:
            concern = "Your child appears to be developing normally for their age."
        elif num_no <= 2:
            concern = "Your child may be slightly behind on some milestones. It’s okay to wait and watch, but if you're concerned, consult a pediatrician."
        else:
            concern = "Several milestones were not met. It is recommended to consult a pediatrician for further evaluation."

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

        print("Prompt to Gemini:\n", prompt)
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

@milestone_bp.route('/get_milestone_responses', methods=['POST'])
def get_milestone_responses():
    try:
        data = request.json
        name = data.get("name")
        phone = data.get("phone")
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
            q = row["milestonequestion"]
            grouped.setdefault(q, []).append({
                "answer": row["milestoneanswer"],
                "timestamp": row["craeteddate"].strftime("%Y-%m-%d")
            })

        return jsonify({"milestone_responses": grouped})

    except Exception as e:
        print("Error in /get_milestone_responses:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
