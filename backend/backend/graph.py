from flask import Flask, jsonify, request,Blueprint
import mysql.connector

graph_bp = Blueprint('graph', __name__)

@graph_bp.route("/height_for_age", methods=["GET"])
def get_height_for_age():
    gender = request.args.get("gender", "Male")  # Default to Male
    conn = mysql.connector.connect(
        host="localhost", user="root", password="your_password", database="shishu_vriddhi"
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tbl_height_for_age WHERE gender = %s", (gender,))
    data = cursor.fetchall()
    conn.close()
    return jsonify(data)
