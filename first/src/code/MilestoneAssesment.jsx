// MilestoneAssessment.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ArrowLeft, LogOut } from "lucide-react";
import "./milestone.css";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import axios from "axios";

function MilestoneAssessment() {
  const [milestones, setMilestones] = useState([]);
  const [responses, setResponses] = useState({});
  const [pastResponses, setPastResponses] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [concern, setConcern] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false); // State to control history view

  // Pagination states for history
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 6; // Number of sessions to display per page

  const [childInfo, setChildInfo] = useState(JSON.parse(localStorage.getItem("childInfo")));
  const [parentName, setParentName] = useState(localStorage.getItem("parentName") || null);
  const [childList, setChildList] = useState(JSON.parse(localStorage.getItem("childList")) || []);

  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
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
      setShowHistory(false); // Hide history when switching child
      setCurrentPage(1); // Reset pagination when switching child
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
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendation) {
          setRecommendation(data.recommendation);
          setConcern(data.concern);
          // After submission, re-fetch past responses to include the new one
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
        <li onClick={() => navigate("/")} className="nav-item"><IoMdHome size={35} />Home</li>
        <li onClick={() => navigate("/child-info")} className="nav-item"><PiBabyBold size={35} />Child Info</li>
        <li onClick={() => navigate("/chatbot")} className="nav-item"><IoChatbubbleEllipsesSharp size={35} />Chat</li>
        {/* History button */}
        <li onClick={() => setShowHistory(true)} className="nav-item">
          <span style={{ fontSize: "1.5em", marginRight: "5px" }}>&#x1F551;</span>History
        </li>
        <li onClick={() => navigate("/bmicheck")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="nav-item"><span style={{ fontSize: "1.5em" }}>📏</span>CGM</li>
        <li onClick={() => navigate("/signin", { state: { lang: "en" } })} className="nav-item" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <LogOut size={35} />Sign Out
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
          <span className="curve-text5">MILESTONE ASSESSMENT</span>
        </div>
        <div className="curve-right-section">
          {parentName && (
            <div className="parent-header-info">
              Sign in as <strong>{parentName}</strong>
              <div>
                <span>{region ? `${region}, ${country}` : 'Detecting location...'}</span>
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
          <CurveHeader />
          <div className="fixed-child-info2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <span><strong>Child Name:</strong> {childInfo.name}</span>
              <span><strong>Age:</strong> {childInfo.age}</span>
            </div>
          </div>
          <div className="recommendation-container">
            <h3>Personalized Development Recommendations</h3>
            <div className="recommendation-content">
              <p>{recommendation}</p>
              {concern && (
                <p><br /><strong>Concern:</strong> {concern}</p>
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
                Take Assessment Again
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

    // Flatten and sort the past responses by timestamp
    for (let [question, entries] of Object.entries(pastResponses)) {
      entries.forEach(({ answer, timestamp }) => {
        flatList.push({ question, answer, timestamp });
      });
    }

    // Sort by timestamp in descending order (most recent first)
    flatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Group into sessions of 5 questions each
    for (let i = 0; i < flatList.length; i += 5) { // Assuming each "session" is 5 questions as per your original grouping
      groupedSessions.push(flatList.slice(i, i + 5));
    }

    // Pagination logic
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
              <span><strong>Child Name:</strong> {childInfo.name}</span>
              <span><strong>Age:</strong> {childInfo.age}</span>
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
            <p>No past milestone responses available for this child.</p>
          ) : (
            <>
              <div className="accordion-container">
                {currentSessions.map((session, idx) => (
                  // Use a unique key based on the session and its timestamp
                  <details key={`${idx}-${session[0]?.timestamp}`} className="accordion-item">
                    <summary>
                      Session #{groupedSessions.length - (indexOfFirstSession + idx)} –{" "} {/* Adjust session numbering for pagination */}
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
              {/* Pagination Controls */}
              <div className="pagination-controls">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
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
                  Next
                </button>
              </div>
            </>
          )}
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button className="back-button" onClick={() => setShowHistory(false)}>
              <ArrowLeft size={20} /> Answer New Questions
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
              <span><strong>Child Name:</strong> {childInfo.name}</span>
              <span><strong>Age:</strong> {childInfo.age}</span>
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
                      ? "Yes"
                      : option === "No"
                        ? "No"
                        : "Don't know"}
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