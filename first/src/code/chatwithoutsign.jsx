import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import './chatwithoutsignin.css';
import { Volume2, Mic, FileText, FileJson, MessageCircle, LogIn } from 'lucide-react';
import { FaArrowCircleDown, FaRegFilePdf } from "react-icons/fa";
import { IoMdHome } from "react-icons/io";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import translations from './translations15';
import axios from 'axios';

const optionIcons = {
    'Download PDF': FaRegFilePdf,
    'Download TXT': FileText,
    'Download JSON': FileJson,
    'Continue Chat': MessageCircle
};

// Header component (Modified to use translations)
const CurveHeader = ({ t }) => (
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
                <span className="curve-text5">{t('chatWithMe')}</span>
            </div>
        </div>
    </div>
);

function Withoutsignin() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatEnded, setChatEnded] = useState(false);
    const [hasStartedChat, setHasStartedChat] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const [state, setState] = useState({
        signedIn: null,
        age: '',
        mode: '',
        sessionId: ''
    });

    const chatWindowRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Get the language from navigation state, default to 'en'
    const selectedLang = location.state?.lang || 'en';
    const t = (key) => translations[selectedLang][key] || key; // Translation function

    // Update optionIcons with translated keys
    const localizedOptionIcons = {
        [t('downloadPdf')]: FaRegFilePdf,
        [t('downloadTxt')]: FileText,
        [t('downloadJson')]: FileJson,
        [t('continueChat')]: MessageCircle
    };

    // State to manage active navigation item
    const [activeNavItem, setActiveNavItem] = useState('chat'); // Default active item

    useEffect(() => {
        // Set active item based on route or initial state
        if (location.pathname === '/signin') {
            setActiveNavItem('signin');
        } else if (hasStartedChat && state.mode === 'recommend') {
            setActiveNavItem('milestones');
        } else {
            setActiveNavItem('chat');
        }
    }, [location.pathname, hasStartedChat, state.mode]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTo({
                top: chatWindowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    useEffect(() => {
        const storedId = localStorage.getItem('session_id') || crypto.randomUUID();
        localStorage.setItem('session_id', storedId);
        setState(prev => ({ ...prev, sessionId: storedId }));
    }, []);

    useEffect(() => {
        if (hasStartedChat) {
            setMessages([{
                sender: t('expert'),
                text: t('childsAgePrompt'),
                timestamp: new Date().toLocaleString()
            }]);
            setState(prev => ({ ...prev, signedIn: false }));
        }
    }, [hasStartedChat, selectedLang]); // Added selectedLang dependency

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [hasStartedChat]);

const handleSpeak = async (text) => {
    if (!text) return;
    setIsSpeaking(true);

    try {
        const response = await fetch("http://localhost:5000/speech/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }) // corrected key
        });

        if (!response.ok) {
            console.warn("TTS server failed. Falling back to browser TTS.");
            throw new Error("TTS server error");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
    } catch (err) {
        // Fallback to browser TTS
        try {
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-US';
            utter.pitch = 1;
            utter.rate = 1;

            utter.onend = () => setIsSpeaking(false);
            utter.onerror = () => setIsSpeaking(false);

            utteranceRef.current = utter;
            synth.speak(utter);
        } catch (e) {
            console.error("Both TTS methods failed:", e);
            setIsSpeaking(false);
        }
    }
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
                    const response = await axios.post("http://localhost:5000/speech/speech-to-text", formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    const transcribedText = response.data.text;
                    if (transcribedText) {
                        setInput(transcribedText);
                        // Automatically send the transcribed text after successful transcription
                        await handleSend(transcribedText);
                    } else {
                        addBotMessage(t('transcriptionError'));
                    }
                } catch (error) {
                    console.error("Error sending audio to Whisper backend:", error);
                    addBotMessage(t('audioProcessingError'));
                } finally {
                    setLoading(false);
                }
            };
            mediaRecorder.current.start();
            setIsRecording(true);
            console.log("Recording started...");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            addBotMessage(t('microphoneError'));
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

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getStep = () => {
        if (!hasStartedChat) return 'welcome';
        if (state.signedIn === null) return 'signInChoice';
        if (!state.age) return 'askAge';
        if (!state.mode) return 'chooseMode';
        return 'chatting';
    };

    const addBotMessage = (text, options = []) => {
        const newMessage = {
            sender: t('expert'),
            text,
            options,
            timestamp: new Date().toLocaleString()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const sendToBackend = async (input, age, mode, history) => {
        const res = await fetch('http://localhost:5000/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input,
                age,
                mode,
                session_id: state.sessionId,
                conversation_history: history,
                lang: selectedLang
            }),
        });
        return await res.json();
    };

    const actualDownloadChat = (format) => {
        const textContent = messages.map(m => `${m.sender}: ${m.text} (${m.timestamp})`).join('\n');

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(textContent, 180);
            doc.text(lines, 10, 10);
            doc.save("chat_history.pdf");
            return;
        }

        const content = format === 'json'
            ? JSON.stringify(messages, null, 2)
            : textContent;

        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `chat_history.${format}`;
        link.click();
    };

    const handleUserReply = async (inputText) => {
        const step = getStep();
        if (step === 'welcome') return;

        const newMessages = [...messages, {
            sender: t('parent'),
            text: inputText,
            timestamp: new Date().toLocaleString()
        }];
        setMessages(newMessages);
        setLoading(true);

        const lowerInput = inputText.toLowerCase();

        if (lowerInput.includes(t('downloadPdf').toLowerCase())) {
            actualDownloadChat('pdf');
            addBotMessage(t('downloadedPdf'), [t('startNewChat'), t('continueChat')]);
            setLoading(false);
            return;
        }
        if (lowerInput.includes(t('downloadTxt').toLowerCase())) {
            actualDownloadChat('txt');
            addBotMessage(t('downloadedTxt'), [t('startNewChat'), t('continueChat')]);
            setLoading(false);
            return;
        }
        if (lowerInput.includes(t('downloadJson').toLowerCase())) {
            actualDownloadChat('json');
            addBotMessage(t('downloadedJson'), [t('startNewChat'), t('continueChat')]);
            setLoading(false);
            return;
        }
        if (lowerInput.includes(t('startNewChat').toLowerCase())) {
            setMessages([]);
            setInput('');
            setChatEnded(false);
            setHasStartedChat(false);
            setState({
                signedIn: null,
                age: '',
                mode: '',
                sessionId: state.sessionId
            });
            setLoading(false);
            return;
        }
        if (lowerInput.includes(t('continueChat').toLowerCase()) && chatEnded) {
            setChatEnded(false);
            addBotMessage(t('okayHelpNext'));
            setLoading(false);
            return;
        }

        const milestoneKeywords = ['milestone', t('milestone').toLowerCase(), t('getMilestoneRecommendations').toLowerCase()];
        if (milestoneKeywords.some(keyword => lowerInput.includes(keyword))) {
            setState(prev => ({ ...prev, mode: 'recommend' }));
            setActiveNavItem('milestones');
            const result = await sendToBackend('', state.age, 'recommend', newMessages);
            addBotMessage(result?.response || t('unexpectedResponse'), result.options || []);
            setLoading(false);
            return;
        }

        const chatKeywords = ['chat', t('chat').toLowerCase()];
        if (chatKeywords.some(keyword => lowerInput.includes(keyword)) && !chatEnded) {
            setState(prev => ({ ...prev, mode: 'chat' }));
            setActiveNavItem('chat');
            addBotMessage(t('askYourQuestion'));
            setLoading(false);
            return;
        }

        switch (step) {
            case 'signInChoice': {
                const isSigningIn = lowerInput.includes(t('signIn').toLowerCase());
                setState(prev => ({ ...prev, signedIn: isSigningIn }));
                if (!isSigningIn) {
                    addBotMessage(t('chatSavedWarning'));
                }
                addBotMessage(t('childsAgePrompt'));
                break;
            }

            case 'askAge': {
                const result = await sendToBackend('', inputText, 'chat', newMessages);
                if (result?.response?.includes("⚠️")) {
                    addBotMessage(result.response);
                    break;
                }
                setState(prev => ({ ...prev, age: inputText }));
                addBotMessage(t('whatDoYouWantToDo'), [t('continueChat'), t('getMilestoneRecommendations')]);
                break;
            }

            case 'chooseMode': {
                const mode = chatKeywords.some(keyword => lowerInput.includes(keyword)) ? 'chat' : 'recommend';
                setState(prev => ({ ...prev, mode }));
                setActiveNavItem(mode === 'chat' ? 'chat' : 'milestones');

                if (mode === 'recommend') {
                    const result = await sendToBackend('', state.age, 'recommend', []);
                    addBotMessage(result?.response || t('unexpectedResponse'), result.options || []);
                } else {
                    addBotMessage(t('greatFirstQuestion'));
                }
                break;
            }

            case 'chatting': {
                const result = await sendToBackend(inputText, state.age, state.mode, newMessages);
                addBotMessage(result?.response || t('unexpectedResponse'), result.options || []);
                if (state.mode === 'recommend' && !result.options) {
                    setState(prev => ({ ...prev, mode: '' }));
                    setActiveNavItem('chat');
                    addBotMessage(t('whatDoYouWantTo'), [t('continueChat'), t('getMilestoneRecommendations')]);
                }
                break;
            }

            default:
                addBotMessage(t('somethingWentWrong'));
                break;
        }

        setLoading(false);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        handleUserReply(input.trim());
        setInput('');
    };

    const downloadChat = () => {
        setChatEnded(true);
        setActiveNavItem('download');
        addBotMessage(t('downloadInFormat'), [t('downloadPdf'), t('downloadTxt'), t('downloadJson'), t('continueChat')]);
    };

    const WelcomeModal = () => (
        <div className="modal-overlay">
            <div className="modal-content">
                <p>{t('conversationNotSaved')}</p>
                <p>{t('signInPrompt')}</p>
                <div className="options">
                    <button onClick={() => { navigate("/signin", { state: { lang: selectedLang } }); setActiveNavItem('signin'); }}>{t('signIn')}</button>
                    <button onClick={() => setHasStartedChat(true)}>{t('continueChat')}</button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="page-layout">
                <div className="left-nav">
                    <ul>
                        <li onClick={() => navigate("/")}><IoMdHome size={35} />{t('home')}</li>
                        <li
                            onClick={() => { navigate("/signin", { state: { lang: selectedLang } }); setActiveNavItem('signin'); }}
                            className={activeNavItem === 'signin' ? 'active' : ''}
                            style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                        >
                            <LogIn size={35} />{t('signIn')}
                        </li>
                        <li
                            onClick={() => { handleUserReply(t('continueChat')); setActiveNavItem('chat'); }}
                            className={`${!state.age ? 'disabled' : ''} ${activeNavItem === 'chat' ? 'active' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                        >
                            <IoChatbubbleEllipsesSharp size={35} />{t('chat')}
                        </li>
                        <li
                            onClick={() => { handleUserReply(t('getMilestoneRecommendations')); setActiveNavItem('milestones'); }}
                            className={`${!state.age ? 'disabled' : ''} ${activeNavItem === 'milestones' ? 'active' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                        >
                            <span style={{ fontSize: "1.5em" }}>📊</span>{t('milestone')}
                        </li>
                    </ul>
                </div>
                <CurveHeader t={t} />
                <div className="download-button-wrapper">
                    <button
                        className="download-btn-top"
                        onClick={downloadChat}
                        disabled={chatEnded || loading}
                    >
                        <FaArrowCircleDown style={{ marginRight: '8px' }} /> {t('download')}
                    </button>
                </div>

                <div className="main-wrapper2">
                    <div className="chat-heading-row">
                        <h3 className="chat-heading">{t('chatWithMe')}</h3>
                    </div>
                    <div className="chat-window1" ref={chatWindowRef}>
                        {messages.map((msg, i) => (
                            <div key={i}>
                                <div className={msg.sender === t('parent') ? 'user-msg' : 'bot-msg'}>
                                    <div className="avatar2">{msg.sender === t('parent') ? '👩‍👧' : '🧑‍⚕️'}</div>
                                    <div className="message">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <strong>{msg.sender}</strong>
                                            <button className="speak-btn" onClick={() => handleSpeak(msg.text)} title={isSpeaking ? t('stopSpeaking') : t('speak')}>
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
                                            const IconComponent = localizedOptionIcons[opt];
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleUserReply(opt)}
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
                        {loading && <div className="typing">{t('expertIsTyping')}</div>}
                    </div>

                    {!chatEnded && (
                        <div className="input-row">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={t('typeYourMessage')}
                                disabled={loading || messages[messages.length - 1]?.options?.length > 0 || isRecording}
                            />
                            <button
                                onClick={input.trim() ? handleSend : handleMicButtonClick}
                                disabled={loading || (input.trim() && !input.trim())}
                                className={input.trim() ? "send-button" : "mic-button"}
                                title={input.trim() ? t('send') : (isRecording ? t('stopRecording') : t('startRecording'))}
                                style={isRecording && !input.trim() ? { backgroundColor: 'red' } : {}}
                            >
                                {input.trim() ? t('send') : <Mic color={isRecording ? 'white' : 'black'} />}
                            </button>
                        </div>
                    )}

                    {chatEnded && (
                        <div className="end-chat">
                            <button onClick={() => handleUserReply(t('startNewChat'))}>
                                {t('startNewChat')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {!hasStartedChat && <WelcomeModal />}
        </>
    );
}

export default Withoutsignin;