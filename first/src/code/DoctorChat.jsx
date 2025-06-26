import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { io } from "socket.io-client";
import './chat.css';

const socket = io("http://localhost:5001"); // Assuming your Flask backend is also on localhost:5001, adjust if needed

function DoctorChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { childInfo: initialChildInfo, doctor } = location.state || {}; // Rename to initialChildInfo
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatWindowRef = useRef(null);
  const currentParentName = localStorage.getItem("parentName") || "Parent";

  const doctorActualName = doctor?.doctor_name || "";
  const doctorPhone = doctor?.phone_number || "defaultPhone";
  const roomId = `${initialChildInfo?.id || 'no_child_id'}_${doctorPhone}`; // Handle case where initialChildInfo might be undefined

  // State to store the fetched child details
  const [fetchedChildDetails, setFetchedChildDetails] = useState(null);

  const resolveSenderName = (sender) => {
    if (sender === doctorPhone) return doctorActualName;
    if (sender === currentParentName) return currentParentName;
    return sender;
  };

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

  // Effect to fetch child details
  useEffect(() => {
    const fetchChildDetails = async () => {
      if (initialChildInfo && initialChildInfo.id) {
        try {
          // Construct the URL for the child info endpoint
          const response = await fetch(`http://localhost:5000/chatbot/child/info/${initialChildInfo.id}`); // Assuming your Flask app runs on port 5001
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Child with ID ${initialChildInfo.id} not found.`);
              setFetchedChildDetails(null); // Or set an error state
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          }
          const data = await response.json();
          setFetchedChildDetails(data);
        } catch (error) {
          console.error("Error fetching child details:", error);
          setFetchedChildDetails(null); // Clear previous details on error
        }
      }
    };

    fetchChildDetails();
  }, [initialChildInfo]); // Re-run when initialChildInfo changes (e.g., if navigating with different child data)

  // Initial welcome message (now using fetchedChildDetails)
  useEffect(() => {
    if (fetchedChildDetails && doctorActualName) {
      setMessages([{
        sender: doctorActualName,
        text: `Hello, I'm ${doctorActualName}. How can I help you regarding ${fetchedChildDetails.name}?`,
        timestamp: formatTimestamp(new Date())
      }]);
    }
  }, [fetchedChildDetails, doctorActualName]);


  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5001/messages/${roomId}`);
        const data = await res.json();
        const formattedData = data.map(msg => ({
          ...msg,
          timestamp: formatTimestamp(msg.timestamp)
        }));
        setMessages(formattedData);
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    };
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    socket.emit("join_room", { room: roomId, user: currentParentName });

    socket.on("receive_message", (data) => {
      const formattedData = {
        ...data,
        timestamp: formatTimestamp(data.timestamp || new Date())
      };
      setMessages(prev => [...prev, formattedData]);
    });

    socket.on("system_message", (data) => {
      setMessages(prev => [...prev, {
        sender: "System",
        text: data.message,
        timestamp: formatTimestamp(new Date())
      }]);
    });

    return () => {
      socket.emit("leave_room", { room: roomId, user: currentParentName });
      socket.off("receive_message");
      socket.off("system_message");
    };
  }, [roomId, currentParentName]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSpeak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
    setIsSpeaking(true);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const timestamp = formatTimestamp(new Date());
    const messageData = {
      sender: currentParentName,
      message: input,
      timestamp,
      room: roomId
    };

    socket.emit("send_message", messageData);
    setInput("");
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
            <span className="curve-text5">Chat with {doctorActualName}</span>
          </div>
          <div className="curve-right-section">
            <div className="child-info-line">Signed in as {currentParentName}</div>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="left-nav1">
        <ul>
          <li onClick={() => navigate("/")}><IoMdHome size={35} />Home</li>
          <li onClick={() => navigate("/child-info")}><PiBabyBold size={35} />Child Info</li>
          <li onClick={() => navigate("/milestone")}>📊 Milestone</li>
          <li onClick={() => navigate("/bmicheck")}>📏 CGM</li>
          <li onClick={() => navigate("/signin")}><LogOut size={30} />Sign Out</li>
        </ul>
      </div>

      {/* Display fetched child details */}
      {fetchedChildDetails && (
        <div className="fixed-child-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <span><strong>Child Name:</strong> {fetchedChildDetails.name}</span>
            <span><strong>Age:</strong> {fetchedChildDetails.age} </span>
            <span><strong>Gender:</strong> {fetchedChildDetails.gender}</span>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="main-wrapper3">
        <div className="chat-window1" ref={chatWindowRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.sender === currentParentName ? "user-msg" : "bot-msg"}>
              <div className="avatar2">
                {msg.sender === currentParentName
                  ? "👩‍👧"
                  : msg.sender === doctorPhone || msg.sender === doctorActualName
                  ? "🧑‍⚕️"
                  : "💬"}
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

        {/* Input Field */}
        <div className="input-row">
          <input
  type="text"
  value={input}
  onChange={e => setInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleSend();
    }
  }}
  placeholder={`Ask ${doctorActualName} a question...`}
/>

          {!input.trim() ? (
            <button className="mic-button"><Mic /></button>
          ) : (
            <button onClick={handleSend}>Send</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorChat;