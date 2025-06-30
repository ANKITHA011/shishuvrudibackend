import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { io } from "socket.io-client";
import translations from "./translations9";
import './chat.css';

const socket = io("http://localhost:5001");

function ParentChat() {
  const { childId, parentName, doctorPhone } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [childInfo, setChildInfo] = useState(null);
  const chatRef = useRef(null);

  const selectedLang = localStorage.getItem("selectedLang") || "en";
  const t = translations[selectedLang] || translations.en;

  const roomId = `${childId}_${doctorPhone}`;

  const formatTimestamp = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    fetch(`http://localhost:5000/chatbot/doctor_name/${doctorPhone}`)
      .then(res => res.json())
      .then(data => setDoctorName(data?.doctor_name || doctorPhone))
      .catch(err => console.error("Failed to fetch doctor name:", err));
  }, [doctorPhone]);

  useEffect(() => {
    fetch(`http://localhost:5000/chatbot/child/info/${childId}`)
      .then(res => res.json())
      .then(data => setChildInfo(data))
      .catch(err => console.error("Failed to fetch child info:", err));
  }, [childId]);

  useEffect(() => {
    socket.emit("join_room", { room: roomId, user: doctorPhone });

    socket.on("receive_message", (data) => {
      setMessages(prev => [...prev, {
        ...data,
        timestamp: formatTimestamp(data.timestamp || new Date())
      }]);
    });

    socket.on("system_message", (data) => {
      setMessages(prev => [...prev, {
        sender: "System",
        text: data.message,
        timestamp: formatTimestamp(new Date())
      }]);
    });

    return () => {
      socket.emit("leave_room", { room: roomId, user: doctorPhone });
      socket.off("receive_message");
      socket.off("system_message");
    };
  }, [roomId, doctorPhone]);

  useEffect(() => {
    fetch(`http://localhost:5001/messages/${roomId}`)
      .then(res => res.json())
      .then(data => setMessages(data.map(m => ({ ...m, timestamp: formatTimestamp(m.timestamp) }))))
      .catch(err => console.error("Failed to load message history:", err));
  }, [roomId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const messageData = {
      sender: doctorPhone,
      message: input,
      timestamp: formatTimestamp(new Date()),
      room: roomId
    };

    socket.emit("send_message", messageData);
    setInput("");
  };

  const handleSpeak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
    setIsSpeaking(true);
  };

  const resolveSenderName = (sender) => {
    if (sender === doctorPhone) return doctorName;
    if (sender === parentName) return parentName;
    return sender;
  };

  return (
    <div className="page-layout">
      {/* Header */}
      <div className="curve-separator5">
        <svg viewBox="0 0 500 80" preserveAspectRatio="none">
          <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back5" />
          <path d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z" className="wave wave-front5" />
        </svg>
        <div className="curve-content5">
          <div className="curve-left-section">
            <div className="curve-icon5">
              <img src="/baby-icon.png" alt="Baby Icon" />
            </div>
            <span className="curve-app-title">Shishu Vriddhi</span>
          </div>
          <div className="curve-middle-section">
            <span className="curve-text5">{t.chatWith}</span>
          </div>
          <div className="curve-right-section">
            <div className="child-info-line">{t.signedInAs} {doctorName}</div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="left-nav1">
        <ul>
          <li onClick={() => navigate("/")}><IoMdHome size={35} />{t.home}</li>
          <li onClick={() => navigate("/signin",{ state: { lang: selectedLang } })}><LogOut size={30} />{t.signOut}</li>
        </ul>
      </div>

      {/* Child Info */}
      {childInfo && (
        <div className="fixed-child-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <span><strong>{t.childName}:</strong> {childInfo.name}</span>
            <span><strong>{t.age}:</strong> {childInfo.age}</span>
            <span><strong>{t.gender}:</strong> {childInfo.gender}</span>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="main-wrapper3">
        <div className="chat-window1" ref={chatRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.sender === doctorPhone ? "user-msg" : "bot-msg"}>
              <div className="avatar2">
                {msg.sender === doctorPhone ? "🧑‍⚕️" : "👩‍👧"}
              </div>
              <div className="message">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{resolveSenderName(msg.sender)}</strong>
                  {msg.sender !== "System" && (
                    <button className="speak-btn" onClick={() => handleSpeak(msg.text)}>
                      <Volume2 />
                    </button>
                  )}
                </div>
                <span className="message-text">{msg.text}</span>
                <div className="timestamp">{msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.typeMessage}
          />
          {!input.trim() ? (
            <button className="mic-button"><Mic /></button>
          ) : (
            <button onClick={handleSend}>{t.send}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParentChat;
