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

childinfo_bp = Blueprint("childinfo", __name__)

conn = mysql.connector.connect(
    host="localhost", user="root", password="root", database="shishuvrridhhidb"
)
from flask import request, jsonify
from datetime import datetime
#from your_db_connection import conn  # Replace with your actual DB connection import

@childinfo_bp.route("/children", methods=["POST"])
def get_registered_children():
    data = request.json
    phone = data.get("phone")
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    try:
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
                "id": child["childid"],
                "name": child["childname"],
                "gender": child["childgender"],
                "date_of_birth":child["childdateofbirth"],
                "age": age_in_months,
            })

        return jsonify(children)
    except Exception as e:
        return jsonify({"error": str(e)}), 500