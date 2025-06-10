from flask import Blueprint, request, jsonify
import google.generativeai as genai
import re

chat_without_signin_bp = Blueprint("chat_2", __name__)
genai.configure(api_key="AIzaSyDdbViUtt-UirUNisQgLUpvBOyUi7eINhw")  # Replace with env var in production

# In-memory session storage (replace with Redis or DB in production)
session_state = {}

def clean_question(line):
    line = re.sub(r'^(Q\d+:|\d+\.\s*)', '', line)
    line = re.sub(r'\*\*[^:*]+:\*\*', '', line)
    return line.strip()

@chat_without_signin_bp.route('/message', methods=['POST'])
def message():
    data = request.get_json()
    user_input = data.get('input', '').strip()
    age = data.get('age', '').strip()
    mode = data.get('mode', '').strip().lower()
    session_id = data.get('session_id', '').strip()

    try:
        if 'year' in age.lower():
            age_num = int(''.join(filter(str.isdigit, age))) * 12
        else:
            age_num = int(''.join(filter(str.isdigit, age)))
        if age_num < 0 or age_num > 12:
            return jsonify({"response": "⚠️ Please enter an age between 0 and 12 months."})
    except:
        return jsonify({"response": "⚠️ Invalid age format. Please enter the age in months or as 'X months'/'X years'."})

    # 🧠 Chat mode logic
    if mode == 'chat':
        prompt = (
            f"You are a certified Early Childhood Development expert and pediatric consultant. "
            f"A parent of a {age_num}-month-old child asked:\n"
            f"\"{user_input}\"\n\n"
            "Provide a warm, evidence-based response that:\n"
            "- Addresses their specific concern with empathy\n"
            "- Offers practical, actionable advice\n"
            "- Suggests when to consult a pediatrician if relevant\n"
            "- remember the parent and child are from India"
            "- Uses encouraging, supportive language\n\n"
            "Keep the response concise but comprehensive (50–80 words)."
        )

        try:
            model = genai.GenerativeModel("gemini-1.5-flash-latest")
            result = model.generate_content(prompt)
            return jsonify({"response": result.text.strip()})
        except Exception as e:
            # Log the exception for debugging
            print(f"Error calling Gemini API in chat mode: {e}")
            return jsonify({"response": "⚠️ Error generating expert response. Please try again later."})

    # 🎯 Milestone Recommendation Mode
    if mode == 'recommend':
        # Ensure session_state for this session_id exists and has a 'global_milestone_history'
        if session_id not in session_state:
            session_state[session_id] = {'global_milestone_history': set()}

        state = session_state[session_id]
        
        # Check if we are in the middle of a milestone recommendation sequence
        if 'milestone_questions_in_progress' in state and state['milestone_questions_in_progress']:
            current_milestone_session = state['milestone_questions_in_progress']
            
            if current_milestone_session['question_index'] > 0:
                current_milestone_session['answers'].append(user_input)

            if current_milestone_session['question_index'] >= len(current_milestone_session['milestone_questions']):
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

                    return jsonify({
                        "response": result.text.strip(),
                        "completed": len(current_milestone_session['milestone_questions']),
                        "total": len(current_milestone_session['milestone_questions']),
                        "completed_all": True
                    })
                except Exception as e:
                    # Log the exception for debugging
                    print(f"Error calling Gemini API for milestone summary: {e}")
                    return jsonify({"response": "⚠️ Error generating summary. Please try again later."})

            next_question = current_milestone_session['milestone_questions'][current_milestone_session['question_index']]
            current_milestone_session['question_index'] += 1
            return jsonify({
                "response": next_question,
                "options": ["Yes", "No", "Don't Know"],
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
                # If we don't have enough *new* questions, try to get more or inform the user.
                # For this example, we'll just return an error. In a real app, you might
                # have a larger pool of questions or regenerate with a different prompt.
                return jsonify({"response": "⚠️ Not enough new milestone questions available. Try again later."})
            
            # Add the selected questions to the global history
            state['global_milestone_history'].update(q.lower() for q in questions_for_session)

            # Initialize the in-progress milestone session
            state['milestone_questions_in_progress'] = {
                'question_index': 1,
                'answers': [],
                'milestone_age': age_num,
                'milestone_questions': questions_for_session,
            }

            return jsonify({
                "response": questions_for_session[0],
                "options": ["Yes", "No", "Don't Know"],
                "completed": 0,
                "total": len(questions_for_session),
                "completed_all": False
            })
        except Exception as e:
            # Log the exception for debugging
            print(f"Error calling Gemini API for milestone questions: {e}")
            return jsonify({"response": "⚠️ Error generating milestone questions. Please try again later."})

    return jsonify({"response": "⚠️ Invalid mode. Please select 'chat' or 'recommend'."})
