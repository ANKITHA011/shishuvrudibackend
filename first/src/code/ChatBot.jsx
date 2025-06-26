import React, { useEffect, useRef, useState } from "react";
import jsPDF from 'jspdf';
import { useNavigate } from "react-router-dom";
import { Volume2, Mic, LogOut, ArrowDownCircle, FileText, Code, History, Home, Baby } from "lucide-react";
// import './chat.css'; // This CSS file needs to be handled externally or styles moved inline/to Tailwind

// For jsPDF, assume it's loaded via CDN in the HTML environment
// You will need to add <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// to your HTML file where this React app is mounted.

import axios from 'axios';

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
                    <img src="/baby-icon.png" alt="Baby Icon" /> {/* Ensure this image path is correct */}
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

// Map download options to Lucide React icons
const downloadOptionIcons = {
    'Download PDF': FileText, // Using FileText for PDF
    'Download TXT': FileText, // Using FileText for TXT
    'Download JSON': Code,    // Using Code for JSON
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
    const [showDoctorListDialog, setShowDoctorListDialog] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({}); // State for doctor availability
    const [availabilityIntervalId, setAvailabilityIntervalId] = useState(null); // To store interval ID for polling
    
    // NEW STATES FOR WHISPER INTEGRATION
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const chatWindowRef = useRef(null);
    const inputRef = useRef(null);
    const utteranceRef = useRef(null);
    const doctorDialogRef = useRef(null);
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

    // NEW: Effect to manage polling for doctor availability
    useEffect(() => {
        if (showDoctorListDialog && doctors.length > 0) {
            // Clear any existing interval to prevent duplicates
            if (availabilityIntervalId) {
                clearInterval(availabilityIntervalId);
            }

            // Fetch immediately and then every 5 seconds
            fetchAvailabilityForDoctors(doctors); // Initial fetch
            const interval = setInterval(() => {
                fetchAvailabilityForDoctors(doctors);
            }, 5000); // Poll every 5 seconds (adjust as needed)
            setAvailabilityIntervalId(interval);

            // Cleanup function to clear the interval when the dialog is closed or component unmounts
            return () => {
                clearInterval(interval);
                setAvailabilityIntervalId(null);
            };
        } else if (!showDoctorListDialog && availabilityIntervalId) {
            // Clear interval if dialog is closed
            clearInterval(availabilityIntervalId);
            setAvailabilityIntervalId(null);
        }
    }, [showDoctorListDialog, doctors]); // Add doctors to dependency array so it re-runs if doctors list changes


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

    const fetchAvailabilityForDoctors = async (doctorsList) => {
        try {
            const availabilityResults = await Promise.all(
                doctorsList.map(async (doc) => {
                    const res = await axios.get(`http://localhost:5000/chatbot/doctor/availability/${doc.doctor_id}`);
                    return { doctor_id: doc.doctor_id, available: res.data.available };
                })
            );

            const newAvailabilityMap = {};
            availabilityResults.forEach(({ doctor_id, available }) => {
                newAvailabilityMap[doctor_id] = available;
            });

            // Merge new availability with existing map to maintain previous states for other doctors
            setAvailabilityMap(prevMap => ({ ...prevMap, ...newAvailabilityMap }));
        } catch (error) {
            console.error("Failed to fetch doctors availability", error);
            // Optionally, set doctors to offline if fetching fails
            const failedAvailability = {};
            doctorsList.forEach(doc => {
                failedAvailability[doc.doctor_id] = false; // Assume offline on error
            });
            setAvailabilityMap(prevMap => ({ ...prevMap, ...failedAvailability }));
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
    // NEW: Function to start recording audio
    const startRecording = async () => {
        if (isSpeaking) { // Stop any ongoing speech before recording
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
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' }); // Use webm for broader compatibility
                console.log("Audio recorded:", audioBlob);
                // Send to backend for Whisper transcription
                setLoading(true);
                try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm'); // Ensure correct filename and type
                    const response = await axios.post("http://localhost:5000/chatbot/speech-to-text", formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    const transcribedText = response.data.text;
                    if (transcribedText) {
                        setInput(transcribedText); // Set the transcribed text into the input field
                        // Optionally, auto-send the message if you want
                        // handleSend(transcribedText);
                    } else {
                        addBotMessage("Could not transcribe audio. Please try again.", []);
                    }
                } catch (error) {
                    console.error("Error sending audio to Whisper backend:", error);
                    addBotMessage("Error processing speech. Please try typing your message.", []);
                } finally {
                    setLoading(false);
                }
            };
            mediaRecorder.current.start();
            setIsRecording(true);
            console.log("Recording started...");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            addBotMessage("Microphone access denied or an error occurred. Please ensure microphone permissions are granted.", []);
        }
    };
    // NEW: Function to stop recording audio
    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            console.log("Recording stopped.");
        }
    };
    const handleMicButtonClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    const handleSend = async (messageToSend = input) => {
        if (!messageToSend.trim() || !childInfo) return;

        const newUserMsg = {
            sender: "Parent",
            text: messageToSend,
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

        if (!jsPDF) {
            addBotMessage("PDF download is not available. Please ensure jsPDF library is loaded correctly.", []);
            console.error("jsPDF is not loaded.");
            return;
        }

        if (!textContent && format !== 'pdf') {
            console.warn("No chat messages to download.");
            addBotMessage("There are no messages in the chat to download.", []);
            return;
        }

        if (format === 'pdf') {
            try {
                const doc = new jsPDF();
                doc.setFontSize(12);
                const lines = doc.splitTextToSize(textContent || "No chat history available.", 180);
                doc.text(lines, 10, 10);
                doc.save("chat_history.pdf");
                console.log("PDF download initiated successfully by jsPDF.");
                addBotMessage("Your chat history has been downloaded as a PDF.", []);
            } catch (error) {
                console.error("Error generating PDF:", error);
                addBotMessage("Failed to generate PDF. Please try again later.", []);
            }
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
            // The useEffect will now handle fetching availability immediately and then periodically
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
                    <li onClick={() => navigate("/")}><Home size={35} />Home</li>
                    <li onClick={() => navigate("/child-info")} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><span style={{ fontSize: "1.5em" }}><Baby size={35} /></span>Child Info</li>
                    <li onClick={() => navigate("/milestone")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: "1.5em" }}>📊</span>Milestone</li>
                    <li onClick={() => navigate("/bmicheck")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: "1.5em" }}>📏</span>CGM</li>
                    <li onClick={loadHistory} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><History size={30} />Chat History</li>
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
                            <ArrowDownCircle size={18} />
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
                                    onClick={handleChatWithPediatricianClick}
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
                            disabled={loading || isRecording}
                        />

                        {/* Updated Mic Button */}
                        <button
                            onClick={handleMicButtonClick}
                            title={isRecording ? "Stop Recording" : "Start Recording"}
                            className="mic-button"
                            disabled={loading}
                            style={{ backgroundColor: isRecording ? 'red' : 'transparent' }} // Visual feedback for recording
                        >
                            <Mic color={isRecording ? 'white' : 'black'} />
                        </button>

                        <button onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
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
                                    <p>
                                        <strong>Status: </strong>
                                        <span style={{
                                            color: availabilityMap[doc.doctor_id] ? "green" : "gray",
                                            fontWeight: "bold",
                                        }}>
                                            ● {availabilityMap[doc.doctor_id] ? "Online" : "Offline"}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleStartDoctorChat(doc)}
                                    className="chat-button"
                                    // Disable button if doctor is offline
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