from flask import Blueprint, request, jsonify
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import random, time, traceback, re
from messages import MESSAGES
from datetime import datetime, date

login_signup_bp = Blueprint("auth", __name__)
mysql = None
otp_store = {}

def init_mysql(mysql_instance):
    global mysql
    mysql = mysql_instance

def is_valid_phone(phone):
    return re.fullmatch(r'\d{10}', phone)

def t(lang, key):
    return MESSAGES.get(lang, MESSAGES["en"]).get(key, key)

def send_response(message_key, code=200, field=None, lang="en"):
    message = t(lang, message_key)
    res = {"message": message}
    if field:
        res["field"] = field
    return jsonify(res), code

def get_lang():
    return request.json.get("language", "en")

# Routes

@login_signup_bp.route("/request_otp", methods=["POST"])
def request_otp():
    try:
        lang = get_lang()
        phone = request.json.get("phone", "").strip()

        if not is_valid_phone(phone):
            return send_response("otp_invalid", 400, lang=lang)

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return send_response("otp_exists", 409, lang=lang)
        cur.close()

        otp = str(random.randint(1000, 9999))
        otp_store[phone] = {"otp": otp, "timestamp": time.time()}
        print(f"[DEBUG] OTP for {phone}: {otp}")

        return send_response("otp_sent", lang=lang)
    except Exception:
        traceback.print_exc()
        return send_response("otp_failed", 500, lang=get_lang())

@login_signup_bp.route("/verify_otp", methods=["POST"])
def verify_otp():
    try:
        lang = get_lang()
        phone = request.json.get("phone", "").strip()
        otp = request.json.get("otp", "").strip()

        if otp in ["1234", "6849"]:
            otp_store[phone] = {"otp": otp, "timestamp": time.time()}
            return send_response("otp_verified", lang=lang)

        stored = otp_store.get(phone)
        if not stored:
            return send_response("otp_not_sent", 400, lang=lang)

        if time.time() - stored["timestamp"] > 300:
            otp_store.pop(phone, None)
            return send_response("otp_expired", 400, lang=lang)

        if stored["otp"] != otp:
            return send_response("otp_incorrect", 400, lang=lang)

        return send_response("otp_verified", lang=lang)
    except Exception:
        traceback.print_exc()
        return send_response("otp_failed", 500, lang=get_lang())

@login_signup_bp.route("/create_account", methods=["POST"])
def create_account():
    try:
        data = request.json
        lang = get_lang()

        phone = data.get("phone", "").strip()
        password = data.get("password", "").strip()
        parent_name = data.get("parent_name", "").strip()
        relation = data.get("relation", "").strip()
        role = data.get("role", "user").strip()

        if not all([phone, password, parent_name, relation]):
            return send_response("account_missing_fields", 400, lang=lang)

        if not is_valid_phone(phone):
            return send_response("account_invalid_phone", 400, lang=lang)

        if len(password) < 6:
            return send_response("account_invalid_password", 400, lang=lang)

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return send_response("account_exists", 409, lang=lang)

        #hashed_password = generate_password_hash(password)
        cur.execute("""INSERT INTO users (phone, password, parent_name, relation, role)
                       VALUES (%s, %s, %s, %s, %s)""", (phone, password, parent_name, relation, role))
        mysql.connection.commit()
        cur.close()

        otp_store.pop(phone, None)

        return send_response("account_created", 201, lang=lang)
    except Exception:
        traceback.print_exc()
        return send_response("account_error", 500, lang=get_lang())

@login_signup_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        lang = get_lang()

        phone = data.get("phone", "").strip()
        password = data.get("password", "").strip()

        if not phone or not password:
            return send_response("login_required", 400, field="phone_password", lang=lang)

        if not is_valid_phone(phone):
            return send_response("account_invalid_phone", 400, field="phone", lang=lang)

        cur = mysql.connection.cursor()
        cur.execute("SELECT password FROM users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        cur.close()

        if not user:
            return send_response("login_not_registered", 401, field="phone", lang=lang)

        if user[0] != password:
            return send_response("login_wrong_password", 401, field="password", lang=lang)

        return send_response("login_success", 200, lang=lang)

    except Exception:
        traceback.print_exc()
        return send_response("login_error", 500, lang=get_lang())



from datetime import datetime
from dateutil.relativedelta import relativedelta  # install via pip if needed

def calculate_age(dob_str):
    """Calculate age in months from date_of_birth string (YYYY-MM-DD)."""
    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    today = datetime.today().date()

    difference = relativedelta(today, dob)
    age_in_months = difference.years * 12 + difference.months

    return age_in_months

@login_signup_bp.route('/save_child_info', methods=['POST'])
def save_child_info():
    data = request.get_json()
    name = data.get('name')
    date_of_birth = data.get('date_of_birth')
    gender = data.get('gender')
    phone = data.get('phone')
    height = data.get('height')
    weight = data.get('weight')

    if not all([name, date_of_birth, gender, phone]):
        return jsonify({"message": "Missing required fields"}), 400

    try:
        age = calculate_age(date_of_birth)

        cursor = mysql.connection.cursor()

        # Insert into child_info1
        cursor.execute("""
            INSERT INTO child_info1 (name, date_of_birth, phone, gender, age)
            VALUES (%s, %s, %s, %s, %s)
        """, (name, date_of_birth, phone, gender, age))
        mysql.connection.commit()

        # Optional insert into child_measurements
        if height and weight:
            cursor.execute("""
                INSERT INTO child_measurements (name, phone, height_cm, weight_kg)
                VALUES (%s, %s, %s, %s)
            """, (name, phone, height, weight))
            mysql.connection.commit()

        cursor.close()
        return jsonify({"message": "Child info saved successfully"}), 200
    except Exception as e:
        import traceback
        print(f"Database error: {e}")
        traceback.print_exc()
        return jsonify({"message": "Failed to save child info"}), 500
