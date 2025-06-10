// Import necessary libraries and components 
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Volume2 } from "lucide-react";
import "./App.css";

function Index() {
  const [userData, setUserData] = useState(null);
  const [selectedLang, setSelectedLang] = useState("en");
  const [voices, setVoices] = useState([]);
  const [currentTranslatedMessage, setCurrentTranslatedMessage] = useState("");
  const [currentTranslatedWelcome, setCurrentTranslatedWelcome] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const navigate = useNavigate();

  // Reference to dummy input
  const hiddenInputRef = useRef(null);

  const languageOptions = [
    { code: "en", name: "English" },
    { code: "mr", name: "मराठी" },
    { code: "ta", name: "தமிழ்" },
    { code: "hi", name: "हिन्दी" },
    { code: "ml", name: "മലയാളം" },
    { code: "kn", name: "ಕನ್ನಡ" },
    { code: "te", name: "తెలుగు" },
    { code: "bn", name: "বাংলা" },
  ];

  useEffect(() => {
    // Focus hidden dummy input on mount
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }

    // Fetch user info from backend
    axios
      .get("http://127.0.0.1:5000/api/userinfo")
      .then((res) => {
        const data = res.data;
        setUserData(data);
        setSelectedLang(data.lang_code);

        if (data.lang_code !== "en") {
          setCurrentTranslatedMessage(data.message_translated);
          setCurrentTranslatedWelcome(data.welcome_translated);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user data", err);
        alert("Error fetching user data.");
      });

    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  const speakText = (text, langCode) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support text-to-speech.");
      return;
    }

    if (isSpeaking) {
      speechSynthesis.pause();
      setIsSpeaking(false);
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const voice =
      voices.find((v) => v.lang.toLowerCase().includes(langCode.toLowerCase())) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const fetchTranslation = async (text, langCode) => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/api/translate", {
        text,
        dest_lang: langCode,
      });
      return res.data.translated;
    } catch (error) {
      console.error("Translation failed", error);
      return text;
    }
  };

  if (!userData) return <div className="loading">Loading...</div>;

  const translatedMessage =
    selectedLang === "en" ? userData.message_en : currentTranslatedMessage;
  const translatedWelcome =
    selectedLang === "en" ? userData.welcome_en : currentTranslatedWelcome;

  const startChatText = userData.start_chat_texts?.[selectedLang] || "Start Chat";
  const startChatSignInText =
    userData.start_chat_signin_texts?.[selectedLang] || "Start Chat with Sign In";

  return (
    <div className="container">
      {/* Dummy hidden input for focus */}
      <input
        type="text"
        ref={hiddenInputRef}
        style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />

      <div className="main-wrapper-two">
        <div className="left-section">
          <img src="/baby3.png" alt="Instructions" className="instruction-image" />
          <div className="instructions-text">{translatedWelcome}</div>
        </div>

        <div className="right-section">
          <div className="curve-separator9">
            <svg viewBox="0 0 500 80" preserveAspectRatio="none">
              <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back9" />
              <path d="M0,0 C200,90 400,20 500,40 L500,0 L0,0 Z" className="wave-wave-front9" />
            </svg>
            <div className="curve-content9">
              <div className="curve-icon9">
                <img src="/baby-icon.png" alt="Baby Icon" />
              </div>
              <span className="curve-text9">Shishu Vriddhi</span>
            </div>
          </div>

          <div className="chat-container">
            <div className="text-area">
                              <p className="location-info">
    {userData.region} ({userData.country})
  </p>
              <div className="message1-container">
                <p className="message1">{translatedMessage}</p>
                <button
                  className="speak-button"
                  onClick={() => speakText(translatedMessage, selectedLang)}
                >
                  <Volume2 />
                </button>
              </div>

              <div className="language-options">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={async () => {
                      speakText(lang.name, lang.code);

                      if (lang.code === "en") {
                        setCurrentTranslatedMessage("");
                        setCurrentTranslatedWelcome("");
                      } else {
                        const message = await fetchTranslation(userData.message_en, lang.code);
                        const welcome = await fetchTranslation(userData.welcome_en, lang.code);
                        setCurrentTranslatedMessage(message);
                        setCurrentTranslatedWelcome(welcome);
                      }

                      setSelectedLang(lang.code);
                    }}
                    className={`lang-btn-combined ${selectedLang === lang.code ? "selected" : ""}`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>

              <div className="button-group">
                <button
                  className="start-chat-button"
                  onClick={() => navigate("/startchatwithoutsign", { state: { lang: selectedLang } })}
                >
                  {startChatText}
                </button>
                <button
                  className="start-chat-button secondary"
                  onClick={() => navigate("/signin", { state: { lang: selectedLang } })}
                >
                  {startChatSignInText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Index;
