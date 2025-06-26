import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut } from "lucide-react";
import './chat.css';
import { FaArrowCircleDown, FaRegFilePdf, FaFileAlt, FaFileCode, FaHistory } from "react-icons/fa";
import jsPDF from 'jspdf';
import axios from 'axios';
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";

// Helper function to format timestamp
const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const CurveHeader = ({ childInfo, parentName, region, country }) => (
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
                        <span>{region}, {country}</span>
                    </div>
                )}
            </div>
        </div>
    </div>
);

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
    const [userRegion, setUserRegion] = useState("Loading region...");
    const [userCountry, setUserCountry] = useState("Loading country...");
    const [showDoctorListDialog, setShowDoctorListDialog] = useState(false); // New state for dialog
    const [doctors, setDoctors] = useState([]); // New state for doctors list

    const chatWindowRef = useRef(null);
    const inputRef = useRef(null);
    const utteranceRef = useRef(null);
    const doctorDialogRef = useRef(null); // Ref for the doctor list dialog
    const navigate = useNavigate();

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const info = JSON.parse(localStorage.getItem("childInfo"));
        setChildInfo(info);

        const cachedParentName = localStorage.getItem("parentName");
        if (cachedParentName) {
            setParentName(cachedParentName);
        }

        const cachedChildList = JSON.parse(localStorage.getItem("childList"));
        if (cachedChildList) {
            setChildList(cachedChildList);
        }

        if (info?.phone) {
            fetchParentName(info.phone);
        }

        fetchUserInfo();
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

    // Effect to show/hide the dialog using the ref
    useEffect(() => {
        if (showDoctorListDialog) {
            doctorDialogRef.current?.showModal();
        } else {
            doctorDialogRef.current?.close();
        }
    }, [showDoctorListDialog]);

    const fetchUserInfo = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/userinfo");
            setUserRegion(response.data.region);
            setUserCountry(response.data.country);
        } catch (error) {
            console.error("Error fetching user info:", error);
            setUserRegion("Unknown Region");
            setUserCountry("Unknown Country");
        }
    };

    const handleChildSwitch = (selectedId) => {
        const selected = childList.find(c => c.id == selectedId);

        if (selected) {
            const updatedChild = { ...selected, phone: childInfo.phone };
            localStorage.setItem("childInfo", JSON.stringify(updatedChild));
            setChildInfo(updatedChild);
            setMessages([]);
            setInitialMessageSet(false);
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
                    gender: childInfo.gender,
                    childid: childInfo.id
                }),
            });

            const data = await res.json();

            if (data.preview) {
                setMessages([{
                    sender: "Expert",
                    text: `Welcome back! Here's a quick summary of your previous conversation: "${data.preview}"`,
                    timestamp: formatTimestamp(new Date())
                }]);
            } else {
                setMessages([{
                    sender: "Expert",
                    text: `Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about ${childInfo.name}'s development. As a ${childInfo.age}-month-old ${childInfo.gender}, there are many exciting milestones ahead.`,
                    timestamp: formatTimestamp(new Date())
                }]);
            }

            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{
                sender: "Expert",
                text: "Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about your child's development. How can I assist you today?",
                timestamp: formatTimestamp(new Date())
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
                    gender: childInfo.gender,
                    childid: childInfo.id
                }),
            });

            const data = await res.json();

            if (Array.isArray(data.history) && data.history.length > 0) {
                const loaded = data.history.map(msg => ({
                    sender: msg.chatrole === 'user' ? 'Parent' : 'Expert',
                    text: msg.content,
                    timestamp: formatTimestamp(msg.createddate),
                    audio: msg.audio
                }));
                setMessages(loaded);
            } else {
                setMessages([{
                    sender: "Expert",
                    text: "There is no previous chat history available for this child.",
                    timestamp: formatTimestamp(new Date())
                }]);
            }

            setShowHistory(true);
            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to load history:", error);
            setMessages([{
                sender: "Expert",
                text: "⚠️ Failed to load chat history. Please try again later.",
                timestamp: formatTimestamp(new Date())
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
            timestamp: formatTimestamp(new Date())
        };
        setMessages(prev => [...prev, newUserMsg]);
        setLoading(true);
        setInput("");

        const lowerInput = newUserMsg.text.toLowerCase();
        if (lowerInput.includes("download pdf")) {
            downloadChat('pdf');
            setLoading(false);
            setShowDownloadOptions(false);
            return;
        }
        if (lowerInput.includes("download txt")) {
            downloadChat('txt');
            setLoading(false);
            setShowDownloadOptions(false);
            return;
        }
        if (lowerInput.includes("download json")) {
            downloadChat('json');
            setLoading(false);
            setShowDownloadOptions(false);
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/chatbot/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: newUserMsg.text,
                    age: childInfo.age,
                    gender: childInfo.gender,
                    name: childInfo.name,
                    phone: childInfo.phone,
                    childid: childInfo.id
                }),
            });

            const data = await res.json();
            const botReply = {
                sender: "Expert",
                text: data.response || data.error,
                timestamp: formatTimestamp(data.timestamp || new Date()),
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
                timestamp: formatTimestamp(new Date())
            }]);
        } finally {
            setLoading(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const downloadChat = (format) => {
        console.log("Attempting to download in format:", format);
        const textContent = messages.map(m => `${m.sender}: ${m.text} (${m.timestamp})`).join('\n');

        if (!textContent && format !== 'pdf') {
            console.warn("No chat messages to download.");
            addBotMessage("There are no messages in the chat to download.", []);
            return;
        }

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(textContent || "No chat history available.", 180);
            doc.text(lines, 10, 10);
            doc.save("chat_history.pdf");
            console.log("PDF download initiated successfully by jsPDF.");
            addBotMessage("Your chat history has been downloaded as a PDF.", []);
            return;
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

        const blob = new Blob([contentToDownload], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        console.log(`${format.toUpperCase()} download initiated for: ${filename}`);
        addBotMessage(`Your chat history has been downloaded as a ${format.toUpperCase()} file.`, []);
    };

    const handleDownloadClick = () => {
        if (!showDownloadOptions) {
            setShowDownloadOptions(true);
            setMessages(prev => [...prev, {
                sender: "Expert",
                text: "In which format would you like to download the chat?",
                options: ['Download PDF', 'Download TXT', 'Download JSON'],
                timestamp: formatTimestamp(new Date())
            }]);
        }
    };

    const handleDownloadOptionSelect = (option) => {
        console.log("Selected download option:", option);
        const format = option.split(' ')[1].toLowerCase();
        console.log("Derived format for download:", format);
        downloadChat(format);
        setShowDownloadOptions(false);
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
                        timestamp: formatTimestamp(new Date())
                    }
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: "Expert",
                        text: `⚠️ ${data.error || "Unable to generate assessment. Please check the values and try again."}`,
                        timestamp: formatTimestamp(new Date())
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
                    timestamp: formatTimestamp(new Date())
                }
            ]);
        }
    };

    const addBotMessage = (text, options = []) => {
        const newMessage = {
            sender: 'Expert',
            text,
            options,
            timestamp: formatTimestamp(new Date())
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const fetchParentName = async (phoneNumber) => {
        try {
            const res = await axios.post("http://localhost:5000/chatbot/get_parent_name", { phone: phoneNumber });
            if (res.data?.parent_name) {
                setParentName(res.data.parent_name);
                localStorage.setItem("parentName", res.data.parent_name);
            }
        } catch (err) {
            console.error("Failed to fetch parent name:", err);
        }
    };

    const handleChatWithPediatricianClick = async () => {
        try {
            const res = await axios.get('http://localhost:5000/chatbot/doctors');
            setDoctors(res.data);
            setShowDoctorListDialog(true);
        } catch (err) {
            console.error("Error fetching doctors:", err);
            addBotMessage("Failed to load doctor list. Please try again later.", []);
        }
    };

    const handleStartDoctorChat = async (doctor) => {
        try {
            const doctorPhone = doctor.phone_number;
            const childId = childInfo?.id;

            await axios.post("http://localhost:5000/chatbot/create_chat_notification", {
                child_id: childId,
                doctor_id: doctorPhone
            });

            setShowDoctorListDialog(false); // Close the dialog
            navigate('/doctorchat', { state: { doctor, childInfo } }); // Navigate to doctor chat screen
        } catch (error) {
            console.error("Error starting chat or inserting notification:", error);
            addBotMessage("Error: Could not initiate chat with the doctor.", []);
        }
    };

    return (
        <div className="page-layout">
            <CurveHeader childInfo={childInfo} parentName={parentName} region={userRegion} country={userCountry} />

            <div className="left-nav1">
                <ul>
                    <li onClick={() => navigate("/")}><IoMdHome size={35} />Home</li>
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
                        <span><strong>Age:</strong> {childInfo.age}</span>
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
                        {childInfo && (
                            <div style={{ textAlign: 'center', margin: '20px' }}>
                                <button
                                    style={{
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                    onClick={handleChatWithPediatricianClick} // This will now open the dialog
                                >
                                    👨‍⚕️ Chat with Pediatrician
                                </button>
                            </div>
                        )}
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
                            {msg.options?.length > 0 && (
                                <div className="options-buttons">
                                    {msg.options.map((opt, idx) => {
                                        const IconComponent = downloadOptionIcons[opt];
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
    onKeyDown={(e) => {
        if (e.key === 'Enter' && !loading && input.trim()) {
            handleSend();
        }
    }}
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

            <dialog ref={doctorDialogRef} className="doctor-dialog">
    <div className="doctor-dialog-header">
        <h2 className="doctor-dialog-title">Available Pediatricians</h2>

        <button className="close-dialog-button" onClick={() => setShowDoctorListDialog(false)}>✖</button>
    </div>

    <div className="doctor-list">
        {doctors.length > 0 ? (
            doctors.map((doc) => (
                <div key={doc.doctor_id} className="doctor-card">
                    <div className="doctor-details">
                        <p><strong>Name:</strong> {doc.doctor_name}</p>
                        <p><strong>Email:</strong> {doc.email_id}</p>
                    </div>
                    <button
                        onClick={() => handleStartDoctorChat(doc)}
                        className="chat-button"
                    >
                        Start Chat
                    </button>
                </div>
            ))
        ) : (
            <p>No doctors available at the moment.</p>
        )}
    </div>
</dialog>


        </div>
    );
}

export default ChatBot;