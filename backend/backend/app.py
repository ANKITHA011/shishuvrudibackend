from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mysqldb import MySQL
from deep_translator import GoogleTranslator
import requests

# Blueprint imports
from login_signup import login_signup_bp, init_mysql
from chatbot_module import chatbot_bp
from chatwithoutsign import chat_without_signin_bp
from milestone import milestone_bp
from graph import graph_bp
from speech_to_text import speech_to_text_bp

# Flask App Initialization
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'root'
app.config['MYSQL_DB'] = 'shishuvrridhhidb'

# Initialize MySQL
mysql = MySQL(app)
init_mysql(mysql)

# Register blueprints
app.register_blueprint(login_signup_bp, url_prefix="/login")
app.register_blueprint(chatbot_bp, url_prefix="/chatbot")
app.register_blueprint(chat_without_signin_bp)
app.register_blueprint(milestone_bp, url_prefix="/milestone")
app.register_blueprint(graph_bp,url_prefix="/graph")
app.register_blueprint(speech_to_text_bp,url_prefix="/speech")
# Region-to-language mapping
REGION_LANGUAGE_MAP = {
    'Maharashtra': ('Marathi', 'mr'),
    'Tamil Nadu': ('Tamil', 'ta'),
    'West Bengal': ('Bengali', 'bn'),
    'Uttar Pradesh': ('Awadhi', 'hi'),
    'Kerala': ('Malayalam', 'ml'),
    'Karnataka': ('Kannada', 'kn'),
    'Gujarat': ('Gujarati', 'gu'),
    'Punjab': ('Punjabi', 'pa'),
    'Rajasthan': ('Rajasthani', 'hi'),
    'Bihar': ('Maithili', 'hi'),
    'Delhi': ('Haryanvi', 'hi'),
    'Andhra Pradesh': ('Telugu', 'te'),
    'Telangana': ('Telugu', 'te'),
    'Odisha': ('Odia', 'or'),
    'Assam': ('Assamese', 'as'),
}

# Language display mapping
LANG_DISPLAY = {
    'mr': ('मराठी', 'चॅट सुरू करा', 'साइन इन'),
    'ta': ('தமிழ்', 'சாட்டைத் தொடங்கு', 'உள்நுழை'),
    'bn': ('বাংলা', 'চ্যাট শুরু করুন', 'সাইন ইন'),
    'hi': ('हिन्दी', 'चैट शुरू करें', 'साइन इन'),
    'ml': ('മലയാളം', 'ചാറ്റ് ആരംഭിക്കുക', 'സൈൻ ഇൻ'),
    'kn': ('ಕನ್ನಡ', 'ಚಾಟ್ ಪ್ರಾರಂಭಿಸಿ', 'ಸೈನ್ ಇನ್'),
    'gu': ('ગુજરાતી', 'ચેટ શરૂ કરો', 'સાઇન ઇન'),
    'pa': ('ਪੰਜਾਬੀ', 'ਚੈਟ ਸ਼ੁਰੂ ਕਰੋ', 'ਸਾਈਨ ਇਨ'),
    'te': ('తెలుగు', 'చాట్ ప్రారంభించండి', 'సైన్ ఇన్'),
    'or': ('ଓଡ଼ିଆ', 'ଚାଟ୍ ଆରମ୍ଭ କରନ୍ତୁ', 'ସାଇନ୍ ଇନ୍'),
    'as': ('অসমীয়া', 'চ্যাট আৰম্ভ কৰক', 'চাইন ইন'),
    'en': ('English', 'Start Chat', 'Sign In'),
}

# Helper: Translate text
def translate_text(text, dest_lang):
    try:
        translated = GoogleTranslator(source='auto', target=dest_lang).translate(text)
        return translated
    except Exception as e:
        print(f"Translation failed: {e}")
        return text

# API: Return user info based on IP
@app.route('/api/userinfo')
def user_info():
    try:
        geo_data = requests.get('https://api.seeip.org/geoip').json()
        region = geo_data.get('region', 'your region')
        country = geo_data.get('country', 'your country')
        user_ip = geo_data.get('ip', 'unknown')
    except Exception as e:
        print(f"Geo lookup failed: {e}")
        region, country, user_ip = 'your region', 'your country', 'unknown'

    # Language mapping
    language, lang_code = REGION_LANGUAGE_MAP.get(region, ('English', 'en'))

    message_en = f"Hi! It looks like you are from {region} ({country}). Please choose any of the languages below to continue in that language."
    welcome_en = (
        "Welcome to Shishu Vriddhi! Shishu Vriddhi chatbot is an intelligent, interactive tool designed to guide parents "
        "through their baby's growth milestones (ages 0–1), and expert recommendations based on real-time responses."
    )

    message_translated = translate_text(message_en, lang_code)
    welcome_translated = translate_text(welcome_en, lang_code)

    # Prepare button texts in all supported languages
    start_chat_texts = {code: texts[1] for code, texts in LANG_DISPLAY.items()}
    start_chat_signin_texts = {code: texts[2] for code, texts in LANG_DISPLAY.items()}

    return jsonify({
        'region': region,
        'country': country, 
        'ip': user_ip,
        'language': language,
        'lang_code': lang_code,
        'message_en': message_en,
        'welcome_en': welcome_en,
        'message_translated': message_translated,
        'welcome_translated': welcome_translated,
        'translated_language_name': LANG_DISPLAY.get(lang_code, LANG_DISPLAY['en'])[0],
        'start_chat_texts': start_chat_texts,
        'start_chat_signin_texts': start_chat_signin_texts
    })

# API: Translate endpoint
@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get("text", "")
    dest_lang = data.get("dest_lang", "en")
    translated = translate_text(text, dest_lang)
    return jsonify({"translated": translated})

if __name__ == '__main__':
    app.run(debug=True)
