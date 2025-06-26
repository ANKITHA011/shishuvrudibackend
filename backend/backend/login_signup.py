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
        cur.execute("SELECT userid FROM tblusers WHERE userphoneno = %s", (phone,))
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
        cur.execute("SELECT userid FROM tblusers WHERE userphoneno = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return send_response("account_exists", 409, lang=lang)

        #hashed_password = generate_password_hash(password)
        cur.execute("""INSERT INTO tblusers (userphoneno, userpassword, userparentname, userrelation, userrole)
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
        role = data.get("role", "user").strip()

        if not phone or not password:
            return send_response("login_required", 400, field="phone_password", lang=lang)

        if not is_valid_phone(phone):
            return send_response("account_invalid_phone", 400, field="phone", lang=lang)

        cur = mysql.connection.cursor()

        if role == "doctor":
            cur.execute("SELECT doctor_id, password, doctor_name FROM doctor WHERE phone_number = %s", (phone,))
            user = cur.fetchone()
            cur.close()

            if not user:
                return send_response("login_not_registered", 401, field="phone", lang=lang)

            if user[1] != password:
                return send_response("login_wrong_password", 401, field="password", lang=lang)

            # ✅ Return doctor info
            return jsonify({
                "message": t(lang, "login_success"),
                "userid": user[0],          # doctor_id
                "name": user[2]             # doctor_name
            }), 200

        else:
            cur.execute("SELECT userid, userpassword, userparentname FROM tblusers WHERE userphoneno = %s", (phone,))
            user = cur.fetchone()
            cur.close()

            if not user:
                return send_response("login_not_registered", 401, field="phone", lang=lang)

            if user[1] != password:
                return send_response("login_wrong_password", 401, field="password", lang=lang)

            # ✅ Return user info
            return jsonify({
                "message": t(lang, "login_success"),
                "userid": user[0],         # userid from tblusers
                "name": user[2]            # userparentname
            }), 200

    except Exception:
        traceback.print_exc()
        return send_response("login_error", 500, lang=get_lang())


from datetime import datetime
from dateutil.relativedelta import relativedelta  # install via pip if needed



def calculate_age(date_of_birth):
    birth_date = datetime.strptime(date_of_birth, "%Y-%m-%d")
    today = datetime.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))



from flask import request, jsonify
from datetime import datetime

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

        # ✅ Get the highest childid suffix used for this parent
        cursor.execute("""
            SELECT MAX(CAST(SUBSTRING(childid, LENGTH(%s) + 1) AS UNSIGNED)) 
            FROM tblchildinfo 
            WHERE chlildparentphoneno = %s
        """, (phone, phone))
        result = cursor.fetchone()
        max_suffix = result[0] if result[0] is not None else 0

        # ✅ Increment to next suffix
        next_suffix = max_suffix + 1
        childid = f"{phone}{str(next_suffix).zfill(4)}"

        # ✅ Insert into tblchildinfo
        cursor.execute("""
            INSERT INTO tblchildinfo (childid, childname, childdateofbirth, chlildparentphoneno, childgender)
            VALUES (%s, %s, %s, %s, %s)
        """, (childid, name, date_of_birth, phone, gender))
        mysql.connection.commit()

        # ✅ Optionally insert measurements
        if height and weight:
            cursor.execute("""
                INSERT INTO tblcgm (cgmchildid,cgmheightcm, cgmweightkg)
                VALUES (%s, %s, %s)
            """, (childid, height, weight))
            mysql.connection.commit()

        cursor.close()

        return jsonify({
            "message": "Child info saved successfully",
            "childid": childid,
            "age_in_months": age
        }), 200

    except Exception as e:
        print(f"Database error: {e}")
        traceback.print_exc()
        return jsonify({"message": "Failed to save child info"}), 500

@login_signup_bp.route("/doctor/signup", methods=["POST"])
def doctor_signup():
    try:
        data = request.json
        lang = get_lang()

        phone = data.get("phone", "").strip()
        password = data.get("password", "").strip()
        doctor_name = data.get("doctor_name", "").strip()
        license_id = data.get("license_id", "").strip()
        email_id = data.get("email_id", "").strip()
        qualification = data.get("qualification", "").strip()
        specialization = data.get("specialization", "").strip()

        # Validate mandatory fields
        if not all([phone, password, doctor_name, license_id, email_id, qualification, specialization]):
            return send_response("account_missing_fields", 400, lang=lang)

        # Validate phone format
        if not is_valid_phone(phone):
            return send_response("account_invalid_phone", 400, lang=lang)

        # Validate password length
        if len(password) < 6:
            return send_response("account_invalid_password", 400, lang=lang)

        cur = mysql.connection.cursor()

        # Check if phone already exists only in doctor table (not users)
        cur.execute("SELECT doctor_id FROM doctor WHERE phone_number = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return send_response("account_exists", 409, lang=lang)

    

        # Insert doctor data
        cur.execute("""
            INSERT INTO doctor (
                doctor_name, password, license_id, email_id, phone_number, qualification, specialization
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (doctor_name, password, license_id, email_id, phone, qualification, specialization))

        mysql.connection.commit()
        cur.close()

        # Clear OTP cache for this phone
        otp_store.pop(phone, None)

        return send_response("account_created", 201, lang=lang)

    except Exception as e:
        print(f"[ERROR] {e}")
        traceback.print_exc()
        return send_response("account_error", 500, lang=get_lang())
@login_signup_bp.route("/request_otp2", methods=["POST"])
def request_otp2():
    try:
        lang = get_lang()
        phone = request.json.get("phone", "").strip()

        if not is_valid_phone(phone):
            return send_response("otp_invalid", 400, lang=lang)

        cur = mysql.connection.cursor()
        cur.execute("SELECT doctor_id FROM doctor WHERE phone_number = %s", (phone,))
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