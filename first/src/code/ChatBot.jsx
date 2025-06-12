
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut } from "lucide-react";
import './chat.css';
import { FaArrowCircleDown, FaRegFilePdf, FaFileAlt, FaFileCode } from "react-icons/fa";
import jsPDF from 'jspdf';
import axios from 'axios';
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { FaHistory } from "react-icons/fa";

const CurveHeader = ({ childInfo, parentName }) => (
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
                <span className="curve-text5">CHAT WITH ME</span>
            </div>
            <div className="curve-right-section">
                {childInfo && (
                    <div className="curve-right-section">
                        <div className="child-info-line">Sign in as {parentName || "Loading..."}</div>
                        <span>Karnataka,India</span>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Define icons for download options
const downloadOptionIcons = {
    'Download PDF': FaRegFilePdf,
    'Download TXT': FaFileAlt,
    'Download JSON': FaFileCode,
};

function ChatBot() {
    const [childInfo, setChildInfo] = useState(null);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [loading, setLoading] = useState(false);
    const [chatEnded, setChatEnded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [initialMessageSet, setInitialMessageSet] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [parentName, setParentName] = useState(localStorage.getItem("parentName") || null);
    const [childList, setChildList] = useState(JSON.parse(localStorage.getItem("childList")) || []);

    const chatWindowRef = useRef(null);
    const inputRef = useRef(null);
    const utteranceRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const info = JSON.parse(localStorage.getItem("childInfo"));
        setChildInfo(info);
        
        // Set parent name from localStorage immediately to avoid "Loading..."
        const cachedParentName = localStorage.getItem("parentName");
        if (cachedParentName) {
            setParentName(cachedParentName);
        }
        
        // Set child list from localStorage immediately
        const cachedChildList = JSON.parse(localStorage.getItem("childList"));
        if (cachedChildList) {
            setChildList(cachedChildList);
        }
        
        if (info?.phone) {
            fetchParentName(info.phone);
        }
    }, []);

    useEffect(() => {
        if (childInfo && !initialMessageSet) {
            initializeChat();
        }
    }, [childInfo, initialMessageSet]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTo({
                top: chatWindowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleChildSwitch = (selectedId) => {
        const selected = childList.find(c => c.id === parseInt(selectedId));
        if (selected) {
            const updatedChild = { ...selected, phone: childInfo.phone };
            localStorage.setItem("childInfo", JSON.stringify(updatedChild));
            setChildInfo(updatedChild);
            setMessages([]);
            setInitialMessageSet(false); // To reload welcome message
        }
    };

    const initializeChat = async () => {
        if (!childInfo) return;

        try {
            const res = await fetch("http://localhost:5000/chatbot/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: "__load_history__preview__",
                    name: childInfo.name,
                    age: childInfo.age,
                    phone: childInfo.phone,
                    gender: childInfo.gender
                }),
            });

            const data = await res.json();

            if (data.preview) {
                setMessages([{
                    sender: "Expert",
                    text: `Welcome back! Here's a quick summary of your previous conversation: "${data.preview}"`,
                    timestamp: new Date().toLocaleString()
                }]);
            } else {
                setMessages([{
                    sender: "Expert",
                    text: `Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about ${childInfo.name}'s development. As a ${childInfo.age}-month-old ${childInfo.gender}, there are many exciting milestones ahead.`,
                    timestamp: new Date().toLocaleString()
                }]);
            }

            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{
                sender: "Expert",
                text: "Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about your child's development. How can I assist you today?",
                timestamp: new Date().toLocaleString()
            }]);
            setInitialMessageSet(true);
        }
    };

    const loadHistory = async () => {
        if (!childInfo) return;

        try {
            const res = await fetch("http://localhost:5000/chatbot/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: "__load_history__",
                    name: childInfo.name,
                    age: childInfo.age,
                    phone: childInfo.phone,
                    gender: childInfo.gender
                }),
            });

            const data = await res.json();

            if (Array.isArray(data.history) && data.history.length > 0) {
                const loaded = data.history.map(msg => ({
                    sender: msg.role === 'user' ? 'Parent' : 'Expert',
                    text: msg.content,
                    timestamp: msg.timestamp,
                    audio: msg.audio
                }));
                setMessages(loaded);
            } else {
                setMessages([{
                    sender: "Expert",
                    text: "There is no previous chat history available for this child.",
                    timestamp: new Date().toLocaleString()
                }]);
            }

            setShowHistory(true);
            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to load history:", error);
            setMessages([{
                sender: "Expert",
                text: "⚠️ Failed to load chat history. Please try again later.",
                timestamp: new Date().toLocaleString()
            }]);
        }
    };

    const handleSpeak = (text) => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (isSpeaking) {
            synth.cancel();
            setIsSpeaking(false);
            return;
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1;
        utter.lang = 'en-US';

        utteranceRef.current = utter;
        setIsSpeaking(true);

        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);

        synth.speak(utter);
    };

    const handleSend = async () => {
        if (!input.trim() || !childInfo) return;

        const newUserMsg = {
            sender: "Parent",
            text: input,
            timestamp: new Date().toLocaleString()
        };
        setMessages(prev => [...prev, newUserMsg]);
        setLoading(true);
        setInput(""); // Clear input immediately

        // Check if the input is a download command (fallback if user types it)
        const lowerInput = newUserMsg.text.toLowerCase();
        if (lowerInput.includes("download pdf")) {
            downloadChat('pdf');
            setLoading(false);
            setShowDownloadOptions(false); // Hide options after selection
            return;
        }
        if (lowerInput.includes("download txt")) {
            downloadChat('txt');
            setLoading(false);
            setShowDownloadOptions(false); // Hide options after selection
            return;
        }
        if (lowerInput.includes("download json")) {
            downloadChat('json');
            setLoading(false);
            setShowDownloadOptions(false); // Hide options after selection
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/chatbot/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: newUserMsg.text, // Use the actual message, not a download command
                    age: childInfo.age,
                    gender: childInfo.gender,
                    name: childInfo.name,
                    phone: childInfo.phone
                }),
            });

            const data = await res.json();
            const botReply = {
                sender: "Expert",
                text: data.response || data.error,
                timestamp: data.timestamp,
                audio: data.audio
            };

            setMessages(prev => [...prev, botReply]);

            if (botReply.audio) {
                const audio = new Audio(`data:audio/mp3;base64,${botReply.audio}`);
                audio.play();
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                sender: "Expert",
                text: "⚠️ Error fetching response.",
                timestamp: new Date().toLocaleString()
            }]);
        } finally {
            setLoading(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const downloadChat = (format) => {
        console.log("Attempting to download in format:", format); // Debugging log
        const textContent = messages.map(m => `${m.sender}: ${m.text} (${m.timestamp})`).join('\n');

        if (!textContent && format !== 'pdf') { // PDF can generate an empty file if messages are empty, but good to warn
             console.warn("No chat messages to download.");
             addBotMessage("There are no messages in the chat to download.", []);
             return;
        }

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(textContent || "No chat history available.", 180); // Provide fallback text
            doc.text(lines, 10, 10);
            doc.save("chat_history.pdf");
            console.log("PDF download initiated successfully by jsPDF.");
            addBotMessage("Your chat history has been downloaded as a PDF.", []);
            return; // PDF handled directly by jsPDF
        }

        let contentToDownload;
        let mimeType;
        let filename;

        if (format === 'json') {
            contentToDownload = JSON.stringify(messages, null, 2);
            mimeType = 'application/json';
            filename = "chat_history.json";
        } else { // 'txt'
            contentToDownload = textContent;
            mimeType = 'text/plain';
            filename = "chat_history.txt";
        }

        // Create Blob and download link
        const blob = new Blob([contentToDownload], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        // Append to body, trigger click, and clean up
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Release the object URL

        console.log(`${format.toUpperCase()} download initiated for: ${filename}`);
        addBotMessage(`Your chat history has been downloaded as a ${format.toUpperCase()} file.`, []);
    };

    const handleDownloadClick = () => {
        // Only show options if they are not already shown to prevent duplicate messages
        if (!showDownloadOptions) {
            setShowDownloadOptions(true);
            setMessages(prev => [...prev, {
                sender: "Expert",
                text: "In which format would you like to download the chat?",
                options: ['Download PDF', 'Download TXT', 'Download JSON'],
                timestamp: new Date().toLocaleString()
            }]);
        }
    };

    const handleDownloadOptionSelect = (option) => {
        console.log("Selected download option:", option);
        const format = option.split(' ')[1].toLowerCase();
        console.log("Derived format for download:", format);
        downloadChat(format);
        setShowDownloadOptions(false); // Hide the options after one is selected
    };

    const handleHeightWeightCheck = async () => {
        const height = prompt("Enter your child's height in cm:");
        const weight = prompt("Enter your child's weight in kg:");

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

            if (data.recommendation) {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: "Expert",
                        text: `📏 Assessment:\n• Height is ${data.height_status} the ideal range.\n• Weight is ${data.weight_status} the ideal range.\n\n📝 ${data.recommendation}`,
                        timestamp: new Date().toLocaleString()
                    }
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: "Expert",
                        text: `⚠️ ${data.error || "Unable to generate assessment. Please check the values and try again."}`,
                        timestamp: new Date().toLocaleString()
                    }
                ]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [
                ...prev,
                {
                    sender: "Expert",
                    text: "⚠️ Something went wrong with the height/weight check.",
                    timestamp: new Date().toLocaleString()
                }
            ]);
        }
    };

    // Helper to add bot messages
    const addBotMessage = (text, options = []) => {
        const newMessage = {
            sender: 'Expert',
            text,
            options,
            timestamp: new Date().toLocaleString()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const fetchParentName = async (phoneNumber) => {
        try {
            const res = await axios.post("http://localhost:5000/chatbot/get_parent_name", { phone: phoneNumber });
            if (res.data?.parent_name) {
                setParentName(res.data.parent_name);
                // Store in localStorage for persistence across navigation
                localStorage.setItem("parentName", res.data.parent_name);
            }
        } catch (err) {
            console.error("Failed to fetch parent name:", err);
        }
    };

    return (
        <div className="page-layout">
            <CurveHeader childInfo={childInfo} parentName={parentName}/>
             
            <div className="left-nav1">
                <ul>
                <li onClick={() => navigate("/")}><IoMdHome size={35}/>Home</li>
                <li onClick={() => navigate("/child-info")} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><span style={{ fontSize: "1.5em" }}><PiBabyBold size={35} /></span>Child Info</li>
                <li onClick={() => navigate("/milestone")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: "1.5em" }}>📊</span>Milestone</li>
                <li onClick={() => navigate("/bmicheck")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: "1.5em" }}>📏</span>CGM</li>
                <li onClick={loadHistory} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><FaHistory size={30} />Chat History</li>
                <li onClick={() => navigate("/signin", { state: { lang: 'en' } })} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><LogOut size={30} />Sign Out</li>
            </ul>
            </div>
             {childInfo && (
  <div className="fixed-child-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
      <span><strong>Child Name:</strong> {childInfo.name}</span>
      <span><strong>Age in Months:</strong> {childInfo.age}</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      {childList.length > 0 && (
        <select
          value={childInfo?.id || ''}
          onChange={(e) => handleChildSwitch(e.target.value)}
          style={{ padding: '6px', borderRadius: '6px', fontSize: '14px' }}
        >
          {childList.map(child => (
            <option key={child.id} value={child.id}>
              {child.name} ({child.age}m)
            </option>
          ))}
        </select>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownloadClick}
        style={{
    
          color: 'black',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title="Download Chat"
      >
        <FaArrowCircleDown size={18} />
        Download Chat
      </button>
    </div>


  </div>
)}

            <div className="main-wrapper3">
                <div className="chat-window1" ref={chatWindowRef}>
                    {messages.map((msg, i) => (
                        <div key={i}>
                            <div className={msg.sender === 'Parent' ? 'user-msg' : 'bot-msg'}>
                                <div className="avatar2">{msg.sender === 'Parent' ? '👩‍👧' : '🧑‍⚕️'}</div>
                                <div className="message">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{msg.sender}</strong>
                                        <button className="speak-btn" onClick={() => handleSpeak(msg.text)} title="Speak">
                                            <Volume2 color={isSpeaking ? 'black' : 'black'} />
                                        </button>
                                    </div>
                                    <span className="message-text">{msg.text}</span>
                                    {msg.timestamp && <div className="timestamp">{msg.timestamp}</div>}
                                </div>
                            </div>
                            {/* Render download options if they exist in the message */}
                            {msg.options?.length > 0 && (
                                <div className="options-buttons">
                                    {msg.options.map((opt, idx) => {
                                        const IconComponent = downloadOptionIcons[opt]; // Use the new icon mapping
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleDownloadOptionSelect(opt)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                {IconComponent && <IconComponent size={16} />}
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && <div className="typing">🧑‍⚕️ Typing...</div>}
                </div>

                {!chatEnded ? (
                    <div className="input-row">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your child..."
                            disabled={loading}
                        />
                        {!input.trim() ? (
                            <button onClick={() => console.log("Mic clicked")} title="Speak" className="mic-button" disabled={loading}>
                                <Mic />
                            </button>
                        ) : (
                            <button onClick={handleSend} disabled={loading}>Send</button>
                        )}
                    </div>
                ) : (
                    <div className="end-chat">
                        <p>Chat ended. You can restart a new session from the dashboard.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatBot;
