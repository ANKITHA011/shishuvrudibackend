import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ArrowLeft, LogOut } from "lucide-react";
import "./milestone.css";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import axios from "axios";

const translations = {
  en: {
    home: "Home",
    childInfo: "Child Info",
    chat: "Chat",
    history: "History",
    cgm: "CGM",
    signOut: "Sign Out",
    milestoneAssessment: "MILESTONE ASSESSMENT",
    signInAs: "Sign in as",
    loading: "Loading milestone assessment...",
    childName: "Child Name",
    age: "Age",
    personalizedRecommendations: "Personalized Development Recommendations",
    concern: "Concern",
    takeAssessmentAgain: "Take Assessment Again",
    noPastResponses: "No past milestone responses available for this child.",
    session: "Session",
    answerNewQuestions: "Answer New Questions",
    previous: "Previous",
    next: "Next",
    question: "Question",
    of: "of",
    complete: "Complete",
    yes: "Yes",
    no: "No",
    dontKnow: "Don't know",
    getDevelopmentReport: "Get Development Report",
    detectingLocation: "Detecting location..."
  },
  hi: {
    home: "होम",
    childInfo: "बच्चे की जानकारी",
    chat: "चैट",
    history: "इतिहास",
    cgm: "सीजीएम",
    signOut: "साइन आउट",
    milestoneAssessment: "माइलस्टोन आकलन",
    signInAs: "साइन इन किया गया",
    loading: "माइलस्टोन आकलन लोड हो रहा है...",
    childName: "बच्चे का नाम",
    age: "उम्र",
    personalizedRecommendations: "व्यक्तिगत विकास सिफारिशें",
    concern: "चिंता",
    takeAssessmentAgain: "फिर से आकलन करें",
    noPastResponses: "इस बच्चे के लिए कोई पिछली माइलस्टोन प्रतिक्रियाएं उपलब्ध नहीं हैं।",
    session: "सत्र",
    answerNewQuestions: "नए प्रश्नों का उत्तर दें",
    previous: "पिछला",
    next: "अगला",
    question: "प्रश्न",
    of: "का",
    complete: "पूर्ण",
    yes: "हाँ",
    no: "नहीं",
    dontKnow: "पता नहीं",
    getDevelopmentReport: "विकास रिपोर्ट प्राप्त करें",
    detectingLocation: "स्थान का पता लगाया जा रहा है..."
  },
    kn: {
    home: "ಮುಖಪುಟ",
    childInfo: "ಮಗುವಿನ ಮಾಹಿತಿ",
    chat: "ಚಾಟ್",
    history: "ಇತಿಹಾಸ",
    cgm: "ಶರೀರಾಂಶ",
    signOut: "ಸೈನ್ ಔಟ್",
    milestoneAssessment: "ಮೈಲಿಗಲ್ಲು ಮೌಲ್ಯಮಾಪನ",
    signInAs: "ನಿಮ್ಮ ಖಾತೆ:",
    loading: "ಮೈಲಿಗಲ್ಲು ಮೌಲ್ಯಮಾಪನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    childName: "ಮಗುವಿನ ಹೆಸರು",
    age: "ವಯಸ್ಸು",
    personalizedRecommendations: "ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಅಭಿವೃದ್ಧಿ ಶಿಫಾರಸುಗಳು",
    concern: "ಚಿಂತೆ",
    takeAssessmentAgain: "ಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
    noPastResponses: "ಈ ಮಗುವಿಗೆ ಹಿಂದಿನ ಮೈಲಿಗಲ್ಲು ಪ್ರತಿಕ್ರಿಯೆಗಳು ಲಭ್ಯವಿಲ್ಲ.",
    session: "ಅಧಿವೇಶನ",
    answerNewQuestions: "ಹೊಸ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ",
    previous: "ಹಿಂದಿನ",
    next: "ಮುಂದಿನ",
    question: "ಪ್ರಶ್ನೆ",
    of: "ನಲ್ಲಿ",
    complete: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    yes: "ಹೌದು",
    no: "ಇಲ್ಲ",
    dontKnow: "ಗೊತ್ತಿಲ್ಲ",
    getDevelopmentReport: "ಅಭಿವೃದ್ಧಿ ವರದಿ ಪಡೆಯಿರಿ",
    detectingLocation: "ಸ್ಥಳವನ್ನು ಪತ್ತೆ ಮಾಡಲಾಗುತ್ತಿದೆ..."
  }
};

function MilestoneAssessment() {
  const [milestones, setMilestones] = useState([]);
  const [responses, setResponses] = useState({});
  const [pastResponses, setPastResponses] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [concern, setConcern] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 6;
  const [childInfo, setChildInfo] = useState(JSON.parse(localStorage.getItem("childInfo")));
  const [parentName, setParentName] = useState(localStorage.getItem("parentName") || null);
  const [childList, setChildList] = useState(JSON.parse(localStorage.getItem("childList")) || []);
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");

  const navigate = useNavigate();
  const t = translations[language] || translations.en;

  useEffect(() => {
    const navState = window.history.state;
    if (navState && navState.usr && navState.usr.lang) {
      setLanguage(navState.usr.lang);
    }

    axios.get("http://localhost:5000/api/userinfo")
      .then(res => {
        setRegion(res.data.region);
        setCountry(res.data.country);
      })
      .catch(err => {
        console.error("Error fetching user info:", err);
      });
  }, []);

  useEffect(() => {
    const info = JSON.parse(localStorage.getItem("childInfo"));
    setChildInfo(info);
    const cachedParentName = localStorage.getItem("parentName");
    if (cachedParentName) setParentName(cachedParentName);
    const cachedChildList = JSON.parse(localStorage.getItem("childList"));
    if (cachedChildList) setChildList(cachedChildList);
    if (info?.phone) fetchParentName(info.phone);
  }, []);

  useEffect(() => {
    if (!childInfo) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    fetch("http://localhost:5000/milestone/get_milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        age: childInfo.age,
        phone: childInfo.phone,
        childid: childInfo.id,
        language: language
      }),
    })
      .then((res) => res.json())
      .then((data) => setMilestones(data.milestones || []))
      .catch((err) => console.error("Error fetching milestones:", err));

    fetch("http://localhost:5000/milestone/get_milestone_responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        phone: childInfo.phone,
        childid: childInfo.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.milestone_responses) setPastResponses(data.milestone_responses);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching milestone responses:", err);
        setIsLoading(false);
      });
  }, [childInfo]);

  const fetchParentName = async (phoneNumber) => {
    try {
      const res = await axios.post("http://localhost:5000/milestone/get_parent_name", { phone: phoneNumber });
      if (res.data?.parent_name) {
        setParentName(res.data.parent_name);
        localStorage.setItem("parentName", res.data.parent_name);
      }
    } catch (err) {
      console.error("Failed to fetch parent name:", err);
    }
  };

  const handleChildSwitch = (selectedId) => {
    const selected = childList.find(c => c.id == selectedId);
    if (selected) {
      const updatedChild = { ...selected, phone: childInfo.phone };
      localStorage.setItem("childInfo", JSON.stringify(updatedChild));
      setChildInfo(updatedChild);
      setMilestones([]);
      setResponses({});
      setPastResponses({});
      setRecommendation(null);
      setConcern(null);
      setCurrentIndex(0);
      setIsLoading(true);
      setShowHistory(false);
      setCurrentPage(1);
    }
  };

  const handleSelect = (question, answer) => {
    setResponses((prev) => ({ ...prev, [question]: answer }));
  };

  const handleSubmit = () => {
    const answerList = Object.entries(responses).map(([question, answer]) => ({ question, answer }));

    fetch("http://localhost:5000/milestone/submit_milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        age: childInfo.age,
        phone: childInfo.phone,
        childid: childInfo.id,
        answers: answerList,
        language: language
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendation) {
          setRecommendation(data.recommendation);
          setConcern(data.concern);
          fetch("http://localhost:5000/milestone/get_milestone_responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: childInfo.name,
              phone: childInfo.phone,
              childid: childInfo.id,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.milestone_responses) setPastResponses(data.milestone_responses);
            })
            .catch((err) => console.error("Error fetching milestone responses after submit:", err));
        }
      })
      .catch((err) => console.error("Error submitting milestones:", err));
  };

  const renderNavbar = () => (
    <div className="navbar">
      <ul>
        <li onClick={() => navigate("/",{ state: { lang: language } })} className="nav-item"><IoMdHome size={35} />{t.home}</li>
        <li onClick={() => navigate("/child-info",{ state: { lang: language } })} className="nav-item"><PiBabyBold size={35} />{t.childInfo}</li>
        <li onClick={() => navigate("/chatbot",{ state: { lang: language } })} className="nav-item"><IoChatbubbleEllipsesSharp size={35} />{t.chat}</li>
        <li onClick={() => setShowHistory(true)} className="nav-item">
          <span style={{ fontSize: "1.5em", marginRight: "5px" }}>&#x1F551;</span>{t.history}
        </li>
        <li onClick={() => navigate("/bmicheck",{ state: { lang: language } })} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="nav-item"><span style={{ fontSize: "1.5em" }}>📏</span>{t.cgm}</li>
        <li onClick={() => navigate("/signin", { state: { lang: language } })} className="nav-item" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <LogOut size={35} />{t.signOut}
        </li>
      </ul>
    </div>
  );

  const CurveHeader = () => (
    <div className="curve-separator10">
      <svg viewBox="0 0 500 80" preserveAspectRatio="none">
        <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back10" />
        <path d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z" className="wave wave-front10" />
      </svg>
      <div className="curve-content10">
        <div className="curve-left-section">
          <div className="curve-icon10">
            <img src="/baby-icon.png" alt="Baby Icon" />
          </div>
          <span className="curve-app-title">Shishu Vriddhi</span>
        </div>
        <div className="curve-middle-section">
          <span className="curve-text5">{t.milestoneAssessment}</span>
        </div>
        <div className="curve-right-section">
          {parentName && (
            <div className="parent-header-info">
              {t.signInAs} <strong>{parentName}</strong>
              <div>
                <span>{region ? `${region}, ${country}` : t.detectingLocation}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="overall-container">
        {renderNavbar()}
        <div className="main-content">
          <CurveHeader />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (recommendation) {
    return (
      <div className="overall-container">
        {renderNavbar()}
        <div className="main-content">
          <CurveHeader />
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>{t.childName}:</strong> {childInfo.name}</span>
              <span><strong>{t.age}:</strong> {childInfo.age}</span>
            </div>
          </div>
          <div className="recommendation-container">
            <h3>{t.personalizedRecommendations}</h3>
            <div className="recommendation-content">
              <p>{recommendation}</p>
              {concern && (
                <p><br /><strong>{t.concern}:</strong> {concern}</p>
              )}
            </div>
            <div className="action-buttons2">
              <button
                className="back-button"
                onClick={() => {
                  setRecommendation(null);
                  setConcern(null);
                  setCurrentIndex(0);
                  setResponses({});
                }}
              >
                <ArrowLeft size={20} />
                {t.takeAssessmentAgain}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showHistory) {
    const groupedSessions = [];
    const flatList = [];

    for (let [question, entries] of Object.entries(pastResponses)) {
      entries.forEach(({ answer, timestamp }) => {
        flatList.push({ question, answer, timestamp });
      });
    }

    flatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    for (let i = 0; i < flatList.length; i += 5) {
      groupedSessions.push(flatList.slice(i, i + 5));
    }

    const indexOfLastSession = currentPage * sessionsPerPage;
    const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
    const currentSessions = groupedSessions.slice(indexOfFirstSession, indexOfLastSession);

    const totalPages = Math.ceil(groupedSessions.length / sessionsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
      <div className="overall-container">
        {renderNavbar()}
        <div className="main-content">
          <CurveHeader />
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>{t.childName}:</strong> {childInfo.name}</span>
              <span><strong>{t.age}:</strong> {childInfo.age}</span>
            </div>
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
          </div>
          <h2 style={{ marginTop: "20px" }}></h2>
          {groupedSessions.length === 0 ? (
            <p>{t.noPastResponses}</p>
          ) : (
            <>
              <div className="accordion-container">
                {currentSessions.map((session, idx) => (
                  <details key={`${idx}-${session[0]?.timestamp}`} className="accordion-item">
                    <summary>
                      {t.session} #{groupedSessions.length - (indexOfFirstSession + idx)} –{" "}
                      {session[0]?.timestamp ? new Date(session[0].timestamp).toISOString().split('T')[0] : "N/A"}
                    </summary>
                    <ul>
                      {session.map((item, i) => (
                        <li key={i} style={{ marginBottom: "10px" }}>
                          <strong>Q:</strong> {item.question}<br />
                          <strong>A:</strong> {item.answer}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  {t.previous}
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  {t.next}
                </button>
              </div>
            </>
          )}
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button className="back-button" onClick={() => setShowHistory(false)}>
              <ArrowLeft size={20} /> {t.answerNewQuestions}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = milestones[currentIndex];
  const progress = milestones.length > 0 ? ((currentIndex + 1) / milestones.length) * 100 : 0;

  return (
    <div className="overall-container">
      {renderNavbar()}
      <div className="main-content">
        <CurveHeader />
        {childInfo && (
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>{t.childName}:</strong> {childInfo.name}</span>
              <span><strong>{t.age}:</strong> {childInfo.age}</span>
            </div>
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
          </div>
        )}
        <div className="assessment-content">
          <div className="progress-section">
            <div className="progress-info">
              <span>{t.question} {currentIndex + 1} {t.of} {milestones.length}</span>
              <span>{Math.round(progress)}% {t.complete}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {currentQuestion && (
            <div className="milestone-question">
              <div className="question-header">
                <div className="question-number">{currentIndex + 1}</div>
                <div className="question-text">
                  <p>{currentQuestion}</p>
                </div>
              </div>

              <div className="milestone-options">
                {["Yes", "No", "Don't Know"].map((option) => (
                  <button
                    key={option}
                    className={`option-button ${responses[currentQuestion] === option ? "selected" : ""}`}
                    onClick={() => handleSelect(currentQuestion, option)}
                  >
                    {option === "Yes"
                      ? t.yes
                      : option === "No"
                        ? t.no
                        : t.dontKnow}
                  </button>
                ))}
              </div>

              <div className="navigation-buttons">
                <button
                  className="nav-button prev"
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  {t.previous}
                </button>
                {currentIndex < milestones.length - 1 && (
                  <button
                    className="nav-button next"
                    onClick={() =>
                      responses[currentQuestion] &&
                      setCurrentIndex((prev) => Math.min(prev + 1, milestones.length - 1))
                    }
                    disabled={!responses[currentQuestion]}
                  >
                    {t.next}
                  </button>
                )}
              </div>

              {currentIndex === milestones.length - 1 && responses[currentQuestion] && (
                <div className="submit-section">
                  <button className="submit-btn" onClick={handleSubmit}>
                    <Award size={20} />
                    {t.getDevelopmentReport}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MilestoneAssessment;