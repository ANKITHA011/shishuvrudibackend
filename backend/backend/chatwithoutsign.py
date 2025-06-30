from deep_translator import GoogleTranslator, LingueeTranslator # LingueeTranslator for language detection (more robust for short texts)
from flask import Blueprint, request, jsonify
import google.generativeai as genai
import re

chat_without_signin_bp = Blueprint("chat_2", __name__)
genai.configure(api_key="AIzaSyAsSOy7P09yHoIWIjhjO-rsqRWvgHRIo3I")  # Replace with env var in production

# In-memory session storage (replace with Redis or DB in production)
session_state = {}

def clean_question(line):
    line = re.sub(r'^(Q\d+:|\d+\.\s*)', '', line)
    line = re.sub(r'\*\*[^:*]+:\*\*', '', line)
    return line.strip()

def detect_language(text):
    """Detects the language of the given text."""
    if not text.strip():
        return 'en' # Default to English for empty input
    try:
        # LingueeTranslator's detect method is often good for short texts
        # Fallback to GoogleTranslator if Linguee doesn't work or for robustness
        detected_lang = LingueeTranslator(source='auto', target='en').detect(text)
        # Deep_translator's detect returns a list of dictionaries, get the most probable one
        if detected_lang and isinstance(detected_lang, list) and detected_lang[0]:
            return detected_lang[0]['language']
        # Fallback to GoogleTranslator if Linguee fails or returns unexpected format
        return GoogleTranslator(source='auto', target='en').detect(text)
    except Exception as e:
        print(f"Error detecting language: {e}")
        return 'en' # Default to English on error

def translate_text(text, target_language, source_language='auto'):
    """Translates text to the target language using GoogleTranslator."""
    if not text.strip():
        return ""
    if source_language == target_language and source_language != 'auto':
        return text # No translation needed if source and target are the same and known
    try:
        # If source_language is 'auto', GoogleTranslator will detect it
        translated_text = GoogleTranslator(source=source_language, target=target_language).translate(text)
        return translated_text
    except Exception as e:
        print(f"Error translating text: {e}")
        return text # Return original text on translation failure

@chat_without_signin_bp.route('/message', methods=['POST'])
def message():
    data = request.get_json()
    user_input = data.get('input', '').strip()
    age = data.get('age', '').strip()
    mode = data.get('mode', '').strip().lower()
    session_id = data.get('session_id', '').strip()
    
    # This `client_ui_lang` is the language selected in the frontend for UI and general consistency.
    # We will use this for milestone questions and generic messages.
    client_ui_lang = data.get('lang', 'en') 

    try:
        if 'year' in age.lower():
            age_num = int(''.join(filter(str.isdigit, age))) * 12
        else:
            age_num = int(''.join(filter(str.isdigit, age)))
        if age_num < 0 or age_num > 12:
            return jsonify({"response": translate_text("⚠️ Please enter an age between 0 and 12 months.", client_ui_lang)})
    except ValueError: # Catch ValueError specifically for int conversion issues
        return jsonify({"response": translate_text("⚠️ Invalid age format. Please enter the age in months or as 'X months'/'X years'.", client_ui_lang)})
    except Exception as e: # General catch for other unexpected errors
        print(f"Error processing age: {e}")
        return jsonify({"response": translate_text("⚠️ An unexpected error occurred with age input. Please try again.", client_ui_lang)})


    # 🧠 Chat mode logic
    if mode == 'chat':
        # Detect the language of the *current user input*
        input_lang = detect_language(user_input)
        
        prompt = (
            f"You are a certified Early Childhood Development expert and pediatric consultant. "
            f"A parent of a {age_num}-month-old child from India asked:\n" # Specify India as per original prompt
            f"\"{user_input}\"\n\n"
            "Provide a warm, evidence-based response that:\n"
            "- Addresses their specific concern with empathy\n"
            "- Offers practical, actionable advice\n"
            "- Suggests when to consult a pediatrician if relevant\n"
            "- Uses encouraging, supportive language\n\n"
            "Keep the response concise but comprehensive (50–80 words)."
            f"Respond in the language of the user's question, which is detected as {input_lang}." # Explicitly ask Gemini to respond in the input language
        )

        try:
            model = genai.GenerativeModel("gemini-2.0-flash-lite")
            result = model.generate_content(prompt)
            
            # Gemini should ideally respond in `input_lang` due to the prompt.
            # We add a fallback translation just in case Gemini doesn't fully comply.
            # However, for chat mode, the *response_lang* is the user's input language.
            final_response_text = translate_text(result.text.strip(), input_lang, source_language='auto')
            
            return jsonify({"response": final_response_text})
        except Exception as e:
            print(f"Error calling Gemini API in chat mode: {e}")
            return jsonify({"response": translate_text("⚠️ Error generating expert response. Please try again later.", client_ui_lang)})

    # 🎯 Milestone Recommendation Mode
    if mode == 'recommend':
        # Ensure session_state for this session_id exists and has a 'global_milestone_history'
        if session_id not in session_state:
            session_state[session_id] = {'global_milestone_history': set()}

        state = session_state[session_id]
        
        # Check if we are in the middle of a milestone recommendation sequence
        if 'milestone_questions_in_progress' in state and state['milestone_questions_in_progress']:
            current_milestone_session = state['milestone_questions_in_progress']
            
            # User input for milestone questions (Yes/No/Don't Know) should be translated if necessary
            # before being stored or used in the summary prompt, as the summary prompt is in English.
            # However, for simplicity here, we assume these answers are simple enough or will be handled
            # by Gemini's general understanding. The key is translating the *questions* and *summary*.
            if current_milestone_session['question_index'] > 0:
                # For consistency, store translated user answers if the input itself was translated by the UI.
                # Or, if user directly types in local lang, it would need detection.
                # For now, we'll store raw input and ensure summary generation is robust.
                current_milestone_session['answers'].append(user_input)

            if current_milestone_session['question_index'] >= len(current_milestone_session['milestone_questions']):
                # The summary prompt is constructed in English, then translated for the user.
                # It aggregates questions (which are stored in English from Gemini's initial output)
                # and user answers (which are raw input).
                summary_prompt = (
                    f"You are a Child development expert. A parent answered the following for a {current_milestone_session['milestone_age']} month old child:\n"
                    + "\n".join(f"{q}: {a}" for q, a in zip(current_milestone_session['milestone_questions'], current_milestone_session['answers']))
                    + "\nProvide recommendations and tips regarding next steps. Give a friendly 30-40 word summary."
                )
                try:
                    model = genai.GenerativeModel("gemini-1.5-flash-latest")
                    result = model.generate_content(summary_prompt)
                    
                    # Clear the in-progress milestone session after completion
                    del state['milestone_questions_in_progress']

                    # Translate summary to the `client_ui_lang` (navigation language)
                    translated_summary = translate_text(result.text.strip(), client_ui_lang)
                    return jsonify({
                        "response": translated_summary,
                        "completed": len(current_milestone_session['milestone_questions']),
                        "total": len(current_milestone_session['milestone_questions']),
                        "completed_all": True
                    })
                except Exception as e:
                    print(f"Error calling Gemini API for milestone summary: {e}")
                    return jsonify({"response": translate_text("⚠️ Error generating summary. Please try again later.", client_ui_lang)})

            next_question = current_milestone_session['milestone_questions'][current_milestone_session['question_index']]
            current_milestone_session['question_index'] += 1
            
            # Translate the next question to the `client_ui_lang` (navigation language)
            translated_next_question = translate_text(next_question, client_ui_lang)
            # The options "Yes", "No", "Don't Know" should also be translated to `client_ui_lang`
            translated_options = [translate_text(option, client_ui_lang) for option in ["Yes", "No", "Don't Know"]]

            return jsonify({
                "response": translated_next_question,
                "options": translated_options,
                "completed": current_milestone_session['question_index'] - 1,
                "total": len(current_milestone_session['milestone_questions']),
                "completed_all": False
            })

        # 🔄 Start a new milestone session (if not already in progress)
        prompt = (
            f"You are a child development expert chatbot. "
            f"The child is {age_num} months old. "
            f"Please generate exactly 100 short, clear, age-appropriate developmental milestone questions. " # Request more questions initially
            f"For each one, write it as a clear and supportive question a pediatrician might ask a parent during a routine visit. "
            f"Return them as a numbered list (e.g., 1. … 2. …), each on a new line."
        )
        try:
            model = genai.GenerativeModel("gemini-1.5-flash-latest")
            result = model.generate_content(prompt)
            raw_lines = result.text.strip().split('\n')
            
            # Filter out previously asked questions using the global history
            all_generated_questions = [clean_question(line) for line in raw_lines if '?' in line]
            
            # Use a temporary set for this batch to ensure uniqueness within the current response from the model
            unique_new_questions_this_batch = []
            seen_in_batch = set()

            for q in all_generated_questions:
                key = q.lower()
                if key not in state['global_milestone_history'] and key not in seen_in_batch:
                    seen_in_batch.add(key)
                    unique_new_questions_this_batch.append(q)
            
            # Select the first 5 unique questions from the filtered list
            questions_for_session = unique_new_questions_this_batch[:5]

            if len(questions_for_session) < 5:
                return jsonify({"response": translate_text("⚠️ Not enough new milestone questions available. Try again later.", client_ui_lang)})
            
            # Add the selected questions to the global history (store them in English as they came from Gemini)
            state['global_milestone_history'].update(q.lower() for q in questions_for_session)

            # Initialize the in-progress milestone session
            state['milestone_questions_in_progress'] = {
                'question_index': 1,
                'answers': [],
                'milestone_age': age_num,
                'milestone_questions': questions_for_session, # Store questions in English
            }

            # Translate the first question and options for the new session to `client_ui_lang`
            translated_first_question = translate_text(questions_for_session[0], client_ui_lang)
            translated_options = [translate_text(option, client_ui_lang) for option in ["Yes", "No", "Don't Know"]]

            return jsonify({
                "response": translated_first_question,
                "options": translated_options,
                "completed": 0,
                "total": len(questions_for_session),
                "completed_all": False
            })
        except Exception as e:
            print(f"Error calling Gemini API for milestone questions: {e}")
            return jsonify({"response": translate_text("⚠️ Error generating milestone questions. Please try again later.", client_ui_lang)})

    return jsonify({"response": translate_text("⚠️ Invalid mode. Please select 'chat' or 'recommend'.", client_ui_lang)})