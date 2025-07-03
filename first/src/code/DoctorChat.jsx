import React, { useEffect, useRef, useState } from "react";  
import { useLocation, useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { io } from "socket.io-client";
import translations from "./translations5";
import './chat.css';
import axios from 'axios';

const socket = io("http://localhost:5001");

function DoctorChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { childInfo: initialChildInfo, doctor, lang: routeLang } = location.state || {};

  const [language, setLanguage] = useState("en");
  const t = translations[language] || translations.en;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [doctorOnline, setDoctorOnline] = useState(false); // ✅ NEW

  const chatWindowRef = useRef(null);
  const currentParentName = localStorage.getItem("parentName") || "Parent";

  const doctorActualName = doctor?.doctor_name || "";
  const doctorPhone = doctor?.phone_number || "defaultPhone";
  const roomId = `${initialChildInfo?.id || "no_child_id"}_${doctorPhone}`;

  const [fetchedChildDetails, setFetchedChildDetails] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    const savedLang = routeLang || localStorage.getItem("selectedLang") || "en";
    setLanguage(savedLang);
  }, [routeLang]);

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
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  if (!initialChildInfo || !doctor) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Error: Missing doctor or child information.</h2>
        <button onClick={() => navigate("/")}>{t.home}</button>
      </div>
    );
  }

  useEffect(() => {
    const fetchChildDetails = async () => {
      if (initialChildInfo?.id) {
        try {
          const res = await fetch(`http://localhost:5000/chatbot/child/info/${initialChildInfo.id}`);
          if (!res.ok) {
            setFetchedChildDetails(null);
            return;
          }
          const data = await res.json();
          setFetchedChildDetails(data);
        } catch (err) {
          console.error("Child details fetch error:", err);
          setFetchedChildDetails(null);
        }
      }
    };
    fetchChildDetails();
  }, [initialChildInfo]);

  useEffect(() => {
    if (fetchedChildDetails && doctorActualName) {
      setMessages([{
        sender: doctorActualName,
        text: typeof t.doctorWelcome === "function"
          ? t.doctorWelcome(doctorActualName, fetchedChildDetails.name)
          : `Hello, I'm ${doctorActualName}. How can I help you regarding ${fetchedChildDetails.name}?`,
        timestamp: formatTimestamp(new Date())
      }]);
    }
  }, [fetchedChildDetails, doctorActualName, t]);

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
        console.error("Message fetch error:", err);
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
        sender: t.system || "System",
        text: data.message,
        timestamp: formatTimestamp(new Date())
      }]);
    });

    socket.on("user_status", (data) => {
      if (data.user === doctorActualName || data.user === doctorPhone) {
        setDoctorOnline(data.status === "online"); // ✅ NEW
      }
    });

    return () => {
      socket.emit("leave_room", { room: roomId, user: currentParentName });
      socket.off("receive_message");
      socket.off("system_message");
      socket.off("user_status"); // ✅ NEW
    };
  }, [roomId, currentParentName, t.system, doctorActualName, doctorPhone]);

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

  const startRecording = async () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await axios.post("http://localhost:5000/speech/speech-to-text", formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const transcribedText = response.data.text;
          if (transcribedText) {
            setInput(transcribedText);
          } else {
            setMessages(prev => [...prev, {
              sender: t.system || "System",
              text: t.transcriptionError || "Failed to transcribe audio",
              timestamp: formatTimestamp(new Date())
            }]);
          }
        } catch (error) {
          setMessages(prev => [...prev, {
            sender: t.system || "System",
            text: t.audioProcessingError || "Error processing audio",
            timestamp: formatTimestamp(new Date())
          }]);
        }
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      setMessages(prev => [...prev, {
        sender: t.system || "System",
        text: t.microphoneError || "Microphone access error",
        timestamp: formatTimestamp(new Date())
      }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="page-layout">
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
            <span className="curve-text5">{t.chatWithDoctor}</span>
            <div className="doctor-status">
              <strong>{doctorActualName}</strong>
              <span style={{ marginLeft: 10, color: doctorOnline ? 'green' : 'gray' }}>
                ● {doctorOnline ? t.online || 'Online' : t.offline || 'Offline'}
              </span>
            </div>
          </div>
          <div className="curve-right-section">
            <div className="child-info-line">{t.signedInAs} {currentParentName}</div>
          </div>
        </div>
      </div>

      <div className="left-nav1">
        <ul>
          <li onClick={() => navigate("/")}><IoMdHome size={35} />{t.home}</li>
          <li onClick={() => navigate("/child-info",{ state: { lang: language } })}><PiBabyBold size={35} />{t.childInfo}</li>
          <li onClick={() => navigate("/milestone",{ state: { lang: language } })}>📊 {t.milestone}</li>
          <li onClick={() => navigate("/bmicheck",{ state: { lang: language } })}>📏 {t.cgm}</li>
          <li onClick={() => navigate("/signin", { state: { lang: language } })}><LogOut size={30} />{t.signOut}</li>
        </ul>
      </div>

      {fetchedChildDetails && (
        <div className="fixed-child-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <span><strong>{t.childName}:</strong> {fetchedChildDetails.name}</span>
            <span><strong>{t.age}:</strong> {fetchedChildDetails.age}</span>
            <span><strong>{t.gender}:</strong> {fetchedChildDetails.gender}</span>
          </div>
        </div>
      )}

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
                  {msg.sender !== t.system && (
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

        <div className="input-row">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={typeof t.askDoctorPlaceholder === "function"
              ? t.askDoctorPlaceholder(doctorActualName)
              : `Ask ${doctorActualName} a question...`}
          />
          <button
            onClick={input.trim() ? handleSend : handleMicButtonClick}
            className={input.trim() ? "send-button" : "mic-button"}
            style={isRecording && !input.trim() ? { backgroundColor: 'red' } : {}}
            title={input.trim() ? t.send : (isRecording ? t.stopRecording : t.startRecording)}
          >
            {input.trim() ? t.send : <Mic color={isRecording ? 'white' : 'black'} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DoctorChat;
