import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import jsPDF from 'jspdf';
import './chatwithoutsignin.css';
import { Volume2, Mic, FileText, FileJson, FileType, MessageSquareText, LogIn, MessageCircle, LayoutDashboard, Users, CreditCard, CalendarCheck, Settings, MoreVertical } from 'lucide-react'; // Import additional icons
import { FaArrowCircleDown, FaRegFilePdf } from "react-icons/fa";
import { IoMdHome } from "react-icons/io";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { FaUsers } from "react-icons/fa6"; // For the Create Teams icon


// Header component (Keep as is)
const CurveHeader = () => (
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
        </div>
    </div>
);

const optionIcons = {
    'Download PDF': FaRegFilePdf,
    'Download TXT': FileText,
    'Download JSON': FileJson,
    'Continue Chat': MessageCircle
};

function Withoutsignin() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatEnded, setChatEnded] = useState(false);
    const [hasStartedChat, setHasStartedChat] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef(null);

    const [state, setState] = useState({
        signedIn: null,
        age: '',
        mode: '',
        sessionId: ''
    });

    const chatWindowRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation(); // To get current path for active state

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
                sender: 'Expert',
                text: "Please enter your child’s age (e.g., 12 months):",
                timestamp: new Date().toLocaleString()
            }]);
            setState(prev => ({ ...prev, signedIn: false }));
        }
    }, [hasStartedChat]);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [hasStartedChat]);

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

    const handleSpeechToText = () => {
        console.log("Speech-to-text button clicked");
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
            sender: 'Expert',
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
                conversation_history: history
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
            sender: 'Parent',
            text: inputText,
            timestamp: new Date().toLocaleString()
        }];
        setMessages(newMessages);
        setLoading(true);

        const lowerInput = inputText.toLowerCase();

        if (lowerInput.includes("download pdf")) {
            actualDownloadChat('pdf');
            addBotMessage("Your chat history has been downloaded as a PDF. What would you like to do next?", ['Start New Chat', 'Continue Chat']);
            setLoading(false);
            return;
        }
        if (lowerInput.includes("download txt")) {
            actualDownloadChat('txt');
            addBotMessage("Your chat history has been downloaded as a TXT file. What would you like to do next?", ['Start New Chat', 'Continue Chat']);
            setLoading(false);
            return;
        }
        if (lowerInput.includes("download json")) {
            actualDownloadChat('json');
            addBotMessage("Your chat history has been downloaded as a JSON file. What would you like to do next?", ['Start New Chat', 'Continue Chat']);
            setLoading(false);
            return;
        }
        if (lowerInput.includes("start new chat")) {
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
        if (lowerInput.includes("continue chat") && chatEnded) {
            setChatEnded(false);
            addBotMessage("Okay, what else can I help you with?");
            setLoading(false);
            return;
        }

        if (lowerInput.includes("milestone")) {
            setState(prev => ({ ...prev, mode: 'recommend' }));
            setActiveNavItem('milestones'); // Set active nav item
            const result = await sendToBackend('', state.age, 'recommend', newMessages);
            addBotMessage(result?.response || "⚠️ Unexpected response format.", result.options || []);
            setLoading(false);
            return;
        }

        if (lowerInput.includes("chat") && !chatEnded) {
            setState(prev => ({ ...prev, mode: 'chat' }));
            setActiveNavItem('chat'); // Set active nav item
            addBotMessage("💬 Ask your question.");
            setLoading(false);
            return;
        }

        switch (step) {
            case 'signInChoice': {
                const isSigningIn = lowerInput.includes('sign');
                setState(prev => ({ ...prev, signedIn: isSigningIn }));
                if (!isSigningIn) {
                    addBotMessage("⚠️ This conversation will not be saved unless you download it.");
                }
                addBotMessage("Please enter your child’s age (e.g., 12 months or 2 years):");
                break;
            }

            case 'askAge': {
                const result = await sendToBackend('', inputText, 'chat', newMessages);
                if (result?.response?.includes("⚠️")) {
                    addBotMessage(result.response);
                    break;
                }
                setState(prev => ({ ...prev, age: inputText }));
                addBotMessage("What would you like to do?", ['Continue Chat', '📊Get Milestone Recommendations']);
                break;
            }

            case 'chooseMode': {
                const mode = lowerInput.includes('chat') ? 'chat' : 'recommend';
                setState(prev => ({ ...prev, mode }));
                setActiveNavItem(mode === 'chat' ? 'chat' : 'milestones'); // Set active nav item

                if (mode === 'recommend') {
                    const result = await sendToBackend('', state.age, 'recommend', []);
                    addBotMessage(result?.response || "⚠️ Unexpected response format.", result.options || []);
                } else {
                    addBotMessage("Great! Ask your first question about your child.");
                }
                break;
            }

            case 'chatting': {
                const result = await sendToBackend(inputText, state.age, state.mode, newMessages);
                addBotMessage(result?.response || "⚠️ Unexpected response format.", result.options || []);
                if (state.mode === 'recommend' && !result.options) {
                    setState(prev => ({ ...prev, mode: '' }));
                    setActiveNavItem('chat'); // Reset to chat if recommendations are done
                    addBotMessage("What would you like to do next?", ['Continue Chat', '📊Get Milestone Recommendations']);
                }
                break;
            }

            default:
                addBotMessage("Something went wrong. Please refresh.");
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
        setActiveNavItem('download'); // Set active nav item
        addBotMessage("In Which format would you like to download?", ['Download PDF', 'Download TXT', 'Download JSON', 'Continue Chat']);
    };

    const WelcomeModal = () => (
        <div className="modal-overlay">
            <div className="modal-content">
                <p>⚠️ This conversation will not be available for further reference unless you sign in or download it.</p>
                <p>Do you want to sign in?</p>
                <div className="options">
                    <button onClick={() => { navigate("/signin", { state: { lang: 'en' } }); setActiveNavItem('signin'); }}>Sign In</button>
                    <button onClick={() => setHasStartedChat(true)}>Continue Chat</button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="page-layout">
                {/* Removed CurveHeader from here, as it's now inside main-wrapper2 */}

                <div className="left-nav">

                    {/* Navigation Buttons */}
                    <ul>
                    <li onClick={() => navigate("/")}><IoMdHome size={35}/>Home</li>
                    <li
                        onClick={() => { navigate("/signin", { state: { lang: 'en' } }); setActiveNavItem('signin'); }}
                        className={activeNavItem === 'signin' ? 'active' : ''}
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                    >
                        <LogIn size={35} />Sign In
                    </li>
                    <li
                        onClick={() => { handleUserReply('Continue Chat'); setActiveNavItem('chat'); }}
                        className={`${!state.age ? 'disabled' : ''} ${activeNavItem === 'chat' ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                    >
                        <IoChatbubbleEllipsesSharp  size={35}/>Chat
                    </li>
                    <li
                        onClick={() => { handleUserReply('Get Milestone Recommendations'); setActiveNavItem('milestones'); }}
                        className={`${!state.age ? 'disabled' : ''} ${activeNavItem === 'milestones' ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                    >
                      <span style={{ fontSize: "1.5em" }}>📊</span>Milestone
                    </li>
                    <li
                        onClick={downloadChat}
                        disabled={chatEnded || loading}
                        className={activeNavItem === 'download' ? 'active' : ''}
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                    >
                       <FaArrowCircleDown size={50} /> Download
                    </li>

                 </ul>
                </div>
                 <CurveHeader />
                <div className="main-wrapper2">
          
                    <div className="chat-heading-row">
                        <h3 className="chat-heading">CHAT WITH ME</h3>
                    </div>
                    <div className="chat-window1" ref={chatWindowRef}>
                        {messages.map((msg, i) => (
                            <div key={i}>
                                <div className={msg.sender === 'Parent' ? 'user-msg' : 'bot-msg'}>
                                    <div className="avatar2">{msg.sender === 'Parent' ? '👩‍👧' : '🧑‍⚕️'}</div>
                                    <div className="message">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <strong>{msg.sender}</strong>
                                            <button className="speak-btn" onClick={() => handleSpeak(msg.text)} title={isSpeaking ? "Stop speaking" : "Speak"}>
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
                                            const IconComponent = optionIcons[opt];
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
                        {loading && <div className="typing">🧑‍⚕️ Expert is typing...</div>}
                    </div>

                    {!chatEnded && (
                        <div className="input-row">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                disabled={loading || messages[messages.length - 1]?.options?.length > 0}
                            />
                            {!input.trim() ? (
                                <button onClick={handleSpeechToText} title="Speak" className="mic-button" disabled={loading}>
                                    <Mic />
                                </button>
                            ) : (
                                <button onClick={handleSend} disabled={loading || !input.trim()}>
                                    Send
                                </button>
                            )}
                        </div>
                    )}

                    {chatEnded && (
                        <div className="end-chat">
                            <button onClick={() => handleUserReply('Start New Chat')}>
                                Start New Chat
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