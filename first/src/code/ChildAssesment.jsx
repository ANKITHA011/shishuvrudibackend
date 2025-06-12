import React, { useState } from "react";

const ChildAssessmentChat = () => {
  const [messages, setMessages] = useState([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const childInfo = {
    name: "Aarav",
    age: 6,
    gender: "male"
  };

  const handleSubmit = async () => {
    if (!height || !weight) return;

    try {
      const res = await fetch("http://localhost:5000/chatbot/child_assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: childInfo.name,
          age: childInfo.age,
          gender: childInfo.gender,
          height: parseFloat(height),
          weight: parseFloat(weight)
        })
      });

      const data = await res.json();

      const timestamp = new Date().toLocaleString();
      if (data.recommendation) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "Expert",
            text: `📏 Assessment:\n• Height is ${data.height_status} the ideal range.\n• Weight is ${data.weight_status} the ideal range.\n\n📝 ${data.recommendation}`,
            timestamp
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "Expert",
            text: `⚠️ ${data.error || "Unable to generate assessment."}`,
            timestamp
          }
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "Expert",
          text: "⚠️ Something went wrong. Please try again.",
          timestamp: new Date().toLocaleString()
        }
      ]);
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>👶 Child Growth Assistant</div>

      <div style={styles.chatWindow}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "Expert" ? "flex-start" : "flex-end",
              backgroundColor: msg.sender === "Expert" ? "#e6f3ff" : "#dfffd8"
            }}
          >
            <div style={styles.text}>{msg.text}</div>
            <div style={styles.timestamp}>{msg.timestamp}</div>
          </div>
        ))}
      </div>

      <div style={styles.inputSection}>
        <input
          type="number"
          placeholder="Height (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleSubmit} style={styles.button}>Check</button>
      </div>
    </div>
  );
};

const styles = {
  chatContainer: {
    maxWidth: "500px",
    margin: "40px auto",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    fontFamily: "Segoe UI, sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  header: {
    backgroundColor: "#4a90e2",
    color: "#fff",
    padding: "16px",
    fontSize: "1.2rem",
    textAlign: "center"
  },
  chatWindow: {
    padding: "16px",
    height: "400px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f9f9f9"
  },
  message: {
    marginBottom: "14px",
    padding: "10px 14px",
    borderRadius: "8px",
    maxWidth: "90%",
    whiteSpace: "pre-wrap"
  },
  text: {
    fontSize: "0.95rem"
  },
  timestamp: {
    fontSize: "0.75rem",
    color: "#777",
    textAlign: "right",
    marginTop: "4px"
  },
  inputSection: {
    padding: "12px",
    display: "flex",
    gap: "8px",
    backgroundColor: "#f0f4f8"
  },
  input: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px"
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#4a90e2",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }
};

export default ChildAssessmentChat;
