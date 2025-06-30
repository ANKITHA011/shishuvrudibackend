import React, { useEffect, useRef, useState } from "react";
import jsPDF from 'jspdf';
import { useNavigate, useLocation } from "react-router-dom";
import { Volume2, Mic, LogOut, ArrowDownCircle, FileText, Code, History, Home, Baby } from "lucide-react";
import axios from 'axios';
import { IoMdHome } from "react-icons/io";
import translations from "./translations4";
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

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

const CurveHeader = ({ childInfo, parentName, region, country, t }) => (
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
                <span className="curve-text5">{t.chatTitle}</span>
            </div>
            <div className="curve-right-section">
                {childInfo && (
                    <div className="curve-right-section">
                        <div className="child-info-line">{t.signedInAs} {parentName || t.loading}</div>
                        <span>{region}, {country}</span>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Map download options to Lucide React icons
const downloadOptionIcons = {
    'Download PDF': FileText,
    'Download TXT': FileText,
    'Download JSON': Code,
};

function ChatBot() {
    const location = useLocation();
    const selectedLang = location.state?.lang || "en";
    const t = translations[selectedLang] || translations["en"];
    
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
    const [userRegion, setUserRegion] = useState(t.loadingRegion);
    const [userCountry, setUserCountry] = useState(t.loadingCountry);
    const [showDoctorListDialog, setShowDoctorListDialog] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [availabilityIntervalId, setAvailabilityIntervalId] = useState(null);
    
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

    useEffect(() => {
        if (showDoctorListDialog) {
            doctorDialogRef.current?.showModal();
        } else {
            doctorDialogRef.current?.close();
        }
    }, [showDoctorListDialog]);

    useEffect(() => {
        if (showDoctorListDialog && doctors.length > 0) {
            if (availabilityIntervalId) {
                clearInterval(availabilityIntervalId);
            }

            fetchAvailabilityForDoctors(doctors);
            const interval = setInterval(() => {
                fetchAvailabilityForDoctors(doctors);
            }, 5000);
            setAvailabilityIntervalId(interval);

            return () => {
                clearInterval(interval);
                setAvailabilityIntervalId(null);
            };
        } else if (!showDoctorListDialog && availabilityIntervalId) {
            clearInterval(availabilityIntervalId);
            setAvailabilityIntervalId(null);
        }
    }, [showDoctorListDialog, doctors]);

    const fetchUserInfo = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/userinfo");
            setUserRegion(response.data.region);
            setUserCountry(response.data.country);
        } catch (error) {
            console.error("Error fetching user info:", error);
            setUserRegion(t.unknownRegion);
            setUserCountry(t.unknownCountry);
        }
    };

    const fetchAvailabilityForDoctors = async (doctorsList) => {
        try {
            const availabilityResults = await Promise.all(
                doctorsList.map(async (doc) => {
                    const res = await axios.get(`http://localhost:5000/chatbot/doctor/availabilit/${doc.phone_number}`);
                    return { doctor_id: doc.doctor_id, available: res.data.available };
                })
            );

            const newAvailabilityMap = {};
            availabilityResults.forEach(({ doctor_id, available }) => {
                newAvailabilityMap[doctor_id] = available;
            });

            setAvailabilityMap(prevMap => ({ ...prevMap, ...newAvailabilityMap }));
        } catch (error) {
            console.error("Failed to fetch doctors availability", error);
            const failedAvailability = {};
            doctorsList.forEach(doc => {
                failedAvailability[doc.doctor_id] = false;
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
                    childid: childInfo.id,
                    language: selectedLang
                }),
            });

            const data = await res.json();

            if (data.preview) {
                setMessages([{
                    sender: t.expert,
                    text: `${t.welcomeBack} "${data.preview}"`,
                    timestamp: formatTimestamp(new Date())
                }]);
            } else {
                setMessages([{
                    sender: t.expert,
                    text: `${t.welcomeMessage} ${childInfo.name}'s ${t.development}. ${t.ageGenderMessage(childInfo.age, childInfo.gender)}`,
                    timestamp: formatTimestamp(new Date())
                }]);
            }

            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{
                sender: t.expert,
                text: t.defaultWelcomeMessage,
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
                    childid: childInfo.id,
                    language: selectedLang
                }),
            });

            const data = await res.json();

            if (Array.isArray(data.history) && data.history.length > 0) {
                const loaded = data.history.map(msg => ({
                    sender: msg.chatrole === 'user' ? t.parent : t.expert,
                    text: msg.content,
                    timestamp: formatTimestamp(msg.createddate),
                    audio: msg.audio
                }));
                setMessages(loaded);
            } else {
                setMessages([{
                    sender: t.expert,
                    text: t.noHistory,
                    timestamp: formatTimestamp(new Date())
                }]);
            }

            setShowHistory(true);
            setInitialMessageSet(true);
        } catch (error) {
            console.error("Failed to load history:", error);
            setMessages([{
                sender: t.expert,
                text: t.historyError,
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
        utter.lang = selectedLang === 'hi' ? 'hi-IN' : 'en-US';

        utteranceRef.current = utter;
        setIsSpeaking(true);

        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);

        synth.speak(utter);
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
                console.log("Audio recorded:", audioBlob);
                setLoading(true);
                try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');
                    const response = await axios.post("http://localhost:5000/chatbot/speech-to-text", formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    const transcribedText = response.data.text;
                    if (transcribedText) {
                        setInput(transcribedText);
                    } else {
                        addBotMessage(t.transcriptionError, []);
                    }
                } catch (error) {
                    console.error("Error sending audio to Whisper backend:", error);
                    addBotMessage(t.audioProcessingError, []);
                } finally {
                    setLoading(false);
                }
            };
            mediaRecorder.current.start();
            setIsRecording(true);
            console.log("Recording started...");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            addBotMessage(t.microphoneError, []);
        }
    };

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
            sender: t.parent,
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
                    childid: childInfo.id,
                    language: selectedLang
                }),
            });

            const data = await res.json();
            const botReply = {
                sender: t.expert,
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
                sender: t.expert,
                text: t.responseError,
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

        if (format === 'pdf') {
            try {
                const doc = new jsPDF();
                doc.setFontSize(12);
                const lines = doc.splitTextToSize(textContent || t.noChatHistory, 180);
                doc.text(lines, 10, 10);
                doc.save("chat_history.pdf");
                addBotMessage(t.pdfDownloadSuccess, []);
            } catch (error) {
                console.error("Error generating PDF:", error);
                addBotMessage(t.pdfDownloadError, []);
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
        } else {
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

        addBotMessage(t.downloadSuccess(format.toUpperCase()), []);
    };

    const handleDownloadClick = () => {
    setShowDownloadOptions(true);
    setMessages(prev => [...prev, {
        sender: t.expert,
        text: t.downloadPrompt,
        options: [
            { text: t.downloadPDF, format: 'pdf' },
            { text: t.downloadTXT, format: 'txt' },
            { text: t.downloadJSON, format: 'json' }
        ],
        timestamp: formatTimestamp(new Date())
    }]);
};

const handleDownloadOptionSelect = (option) => {
    console.log("Selected option:", option); // Debug log
    downloadChat(option.format);
    setShowDownloadOptions(false);
};

    const addBotMessage = (text, options = []) => {
        const newMessage = {
            sender: t.expert,
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
            addBotMessage(t.doctorListError, []);
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

            setShowDoctorListDialog(false);
            navigate('/doctorchat', { state: { doctor, childInfo, lang: selectedLang } });
        } catch (error) {
            console.error("Error starting chat or inserting notification:", error);
            addBotMessage(t.doctorChatError, []);
        }
    };

    return (
        <div className="page-layout">
            <CurveHeader 
                childInfo={childInfo} 
                parentName={parentName} 
                region={userRegion} 
                country={userCountry}
                t={t}
            />

            <div className="left-nav1">
                <ul>
                    <li onClick={() => navigate("/", { state: { lang: selectedLang } })}>
                        <IoMdHome size={35} />{t.home}
                    </li>
                    <li onClick={() => navigate("/child-info", { state: { lang: selectedLang } })} 
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Baby size={35} />{t.childInfo}
                    </li>
                    <li onClick={() => navigate("/milestone", { state: { lang: selectedLang } })} 
                        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: "1.5em" }}>📊</span>{t.milestone}
                    </li>
                    <li onClick={() => navigate("/bmicheck", { state: { lang: selectedLang } })} 
                        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: "1.5em" }}>📏</span>{t.cgm}
                    </li>
                    <li onClick={loadHistory} 
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <History size={30} />{t.chatHistory}
                    </li>
                    <li onClick={() => navigate("/signin", { state: { lang: selectedLang } })} 
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <LogOut size={30} />{t.signOut}
                    </li>
                </ul>
            </div>

            {childInfo && (
                <div className="fixed-child-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
                        <span><strong>{t.childName}:</strong> {childInfo.name}</span>
                        <span><strong>{t.age}:</strong> {childInfo.age}</span>
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
                            title={t.downloadChat}
                        >
                            <ArrowDownCircle size={18} />
                            {t.downloadChat}
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
                                    👨‍⚕️ {t.chatWithPediatrician}
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
                            <div className={msg.sender === t.parent ? 'user-msg' : 'bot-msg'}>
                                <div className="avatar2">{msg.sender === t.parent ? '👩‍👧' : '🧑‍⚕️'}</div>
                                <div className="message">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{msg.sender}</strong>
                                        <button className="speak-btn" onClick={() => handleSpeak(msg.text)} title={t.speak}>
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
            const IconComponent = downloadOptionIcons[opt.text];
            return (
                <button
                    key={idx}
                    onClick={() => handleDownloadOptionSelect(opt)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    {IconComponent && <IconComponent size={16} />}
                    {opt.text}
                </button>
            );
        })}
    </div>
)}
                        </div>
                    ))}
                    {loading && <div className="typing">🧑‍⚕️ {t.typing}...</div>}
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
                            placeholder={t.inputPlaceholder}
                            disabled={loading || isRecording}
                        />

                        <button
                            onClick={handleMicButtonClick}
                            title={isRecording ? t.stopRecording : t.startRecording}
                            className="mic-button"
                            disabled={loading}
                            style={{ backgroundColor: isRecording ? 'red' : 'transparent' }}
                        >
                            <Mic color={isRecording ? 'white' : 'black'} />
                        </button>

                        <button onClick={handleSend} disabled={loading || !input.trim()}>{t.send}</button>
                    </div>
                ) : (
                    <div className="end-chat">
                        <p>{t.chatEnded}</p>
                    </div>
                )}
            </div>

            <dialog ref={doctorDialogRef} className="doctor-dialog">
                <div className="doctor-dialog-header">
                    <h2 className="doctor-dialog-title">{t.availablePediatricians}</h2>
                    <button className="close-dialog-button" onClick={() => setShowDoctorListDialog(false)}>✖</button>
                </div>

                <div className="doctor-list">
                    {doctors.length > 0 ? (
                        doctors.map((doc) => (
                            <div key={doc.doctor_id} className="doctor-card">
                                <div className="doctor-details">
                                    <p><strong>{t.name}:</strong> {doc.doctor_name}</p>
                                    <p><strong>{t.email}:</strong> {doc.email_id}</p>
                                    <p>
                                        <strong>{t.status}: </strong>
                                        <span style={{
                                            color: availabilityMap[doc.doctor_id] ? "green" : "gray",
                                            fontWeight: "bold",
                                        }}>
                                            ● {availabilityMap[doc.doctor_id] ? t.online : t.offline}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleStartDoctorChat(doc)}
                                    className="chat-button"
                                >
                                    {t.startChat}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p>{t.noDoctorsAvailable}</p>
                    )}
                </div>
            </dialog>
        </div>
    );
}

export default ChatBot;