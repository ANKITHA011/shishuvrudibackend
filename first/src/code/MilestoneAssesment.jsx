import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ArrowLeft, LogOut } from "lucide-react";
import "./milestone.css";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import axios from 'axios';

function MilestoneAssessment() {
  const [milestones, setMilestones] = useState([]);
  const [responses, setResponses] = useState({});
  const [pastResponses, setPastResponses] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [concern, setConcern] = useState(null); // New state for concern
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [childInfo, setChildInfo] = useState(JSON.parse(localStorage.getItem("childInfo")));
  const [parentName, setParentName] = useState(localStorage.getItem("parentName") || null);
  const [childList, setChildList] = useState(JSON.parse(localStorage.getItem("childList")) || []);

  const navigate = useNavigate();

  const loadHistory = () => {
    navigate("/history");
  };

  // Effect to load parent name and child list
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

  // Effect to fetch milestones and past responses (depends on childInfo)
  useEffect(() => {
    if (!childInfo) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    fetch("http://localhost:5000/chatbot/get_milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        age: childInfo.age,
        phone: childInfo.phone,
      }),
    })
      .then((res) => res.json())
      .then((data) => setMilestones(data.milestones || []))
      .catch((err) => console.error("Error fetching milestones:", err));

    fetch("http://localhost:5000/chatbot/get_milestone_responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        phone: childInfo.phone,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.milestone_responses) {
          setPastResponses(data.milestone_responses);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching milestone responses:", err);
        setIsLoading(false);
      });
  }, [childInfo]);

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

  const handleChildSwitch = (selectedId) => {
    const selected = childList.find(c => c.id === parseInt(selectedId));
    if (selected) {
      const updatedChild = { ...selected, phone: childInfo.phone };
      localStorage.setItem("childInfo", JSON.stringify(updatedChild));
      setChildInfo(updatedChild);
      // Reset assessment state to load new child's assessment
      setMilestones([]);
      setResponses({});
      setPastResponses({});
      setRecommendation(null);
      setConcern(null); // Reset concern
      setCurrentIndex(0);
      setIsLoading(true);
    }
  };

  const handleSelect = (question, answer) => {
    setResponses((prev) => ({ ...prev, [question]: answer }));
  };

  const handleSubmit = () => {
    const answerList = Object.entries(responses).map(([question, answer]) => ({
      question,
      answer,
    }));

    fetch("http://localhost:5000/chatbot/submit_milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childInfo.name,
        age: childInfo.age,
        phone: childInfo.phone,
        answers: answerList,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendation) {
          setRecommendation(data.recommendation);
          setConcern(data.concern); // Set concern separately
        }
      })
      .catch((err) => console.error("Error submitting milestones:", err));
  };

  const CurveHeader = ({ childInfo, parentName }) => (
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
          <span className="curve-text5">MILESTONE ASSESSMENT</span>
        </div>
        <div className="curve-right-section">
          {parentName && (
            <div className="parent-header-info">
              Sign in as <strong>{parentName}</strong>
              <div><span>Karnataka,India</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNavbar = () => (
    <div className="navbar">
      <ul>
        <li onClick={() => navigate("/")} className="nav-item"><IoMdHome size={35}/>Home</li>
        <li onClick={() => navigate("/child-info")} className="nav-item"><PiBabyBold size={35} />Child Info</li>
        <li onClick={() => navigate("/chatbot")} className="nav-item"><IoChatbubbleEllipsesSharp  size={35}/>Chat</li>
        <li onClick={() => navigate("/bmicheck")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}className="nav-item"><span style={{ fontSize: "1.5em" }}>📏</span>CGM</li>
        <li
          onClick={() => navigate("/signin", { state: { lang: "en" } })}
          className="nav-item"
          style={{ display: "flex", alignItems: "center", gap: "15px" }}
        >
          <LogOut size={35} />Sign Out
        </li>
      </ul>
    </div>
  );

  if (isLoading) {
    return (
      <div className="overall-container">
        {renderNavbar()}
        <div className="main-content">
          <CurveHeader childInfo={childInfo} parentName={parentName} />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading milestone assessment...</p>
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
          <CurveHeader childInfo={childInfo} parentName={parentName} />
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>Child Name:</strong> {childInfo.name}</span>
              <span><strong>Age in Months:</strong> {childInfo.age}</span>
            </div>
          </div>
          <div className="recommendation-container">
            <h3>Personalized Development Recommendations</h3>
            <div className="recommendation-content">
              {/* Render recommendation and concern separately */}
              <p>{recommendation}</p>
              {concern && (
                <p>
                  <br /> {/* This creates a new line */}
                  <strong>Concern based on all the previously answered milestone question:</strong> {concern}
                </p>
              )}
            </div>
            <div className="action-buttons2">
              <button
                className="back-button"
                onClick={() => {
                  setRecommendation(null);
                  setConcern(null); // Reset concern
                  setCurrentIndex(0);
                  setResponses({});
                }}
              >
                <ArrowLeft size={20} />
                Take Assessment Again
              </button>
            </div>
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
        <CurveHeader childInfo={childInfo} parentName={parentName} />
        {childInfo && (
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>Child Name:</strong> {childInfo.name}</span>
              <span><strong>Age in Months:</strong> {childInfo.age}</span>
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
              <span>Question {currentIndex + 1} of {milestones.length}</span>
              <span>{Math.round(progress)}% Complete</span>
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
                      ? "Yes, my child can do this"
                      : option === "No"
                      ? "Not yet"
                      : "I'm not sure"}
                  </button>
                ))}
              </div>

              <div className="navigation-buttons">
                <button
                  className="nav-button prev"
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  Previous
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
                    Next
                  </button>
                )}
              </div>

              {currentIndex === milestones.length - 1 && responses[currentQuestion] && (
                <div className="submit-section">
                  <button className="submit-btn" onClick={handleSubmit}>
                    <Award size={20} />
                    Get Development Report
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