import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import translations from "./translations3";
import "./ChildInfo.css";

import { Volume2, Mic, LogOut } from "lucide-react";
import { IoIosChatboxes } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { IoIosAddCircle } from "react-icons/io";
import { BsThreeDotsVertical } from "react-icons/bs";

function ChildInfo() {
  const [phone, setPhone] = useState(null);
  const [parentName, setParentName] = useState(null);
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [error, setError] = useState("");
  
  const location = useLocation();
  const navigate = useNavigate();
  const dummyInputRef = useRef(null);
  const [visibleActions, setVisibleActions] = useState({});

  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  // Initialize language state
  const [language, setLanguage] = useState("en");
  const t = translations[language] || translations.en;

  useEffect(() => {
    // Check for language in location state first, then localStorage
    const langFromLocation = location.state?.lang;
    const langFromStorage = localStorage.getItem("selectedLang");
    const lang = langFromLocation || langFromStorage || "en";
    
    setLanguage(lang);
    localStorage.setItem("selectedLang", lang);

    if (dummyInputRef.current) {
      dummyInputRef.current.focus();
    }
  }, [location.state]);

  useEffect(() => {
    const savedPhone = localStorage.getItem("phone");
    const cachedChildren = localStorage.getItem("childList");

    if (savedPhone) {
      setPhone(savedPhone);

      if (cachedChildren) {
        try {
          const parsed = JSON.parse(cachedChildren);
          setChildren(parsed);
          setLoadingChildren(false);
        } catch (e) {
          console.error("Error parsing cached child list", e);
        }
      }
    } else {
      setError(t.phoneNotFound);
      setTimeout(() => navigate("/"), 2000);
    }
  }, [navigate, t.phoneNotFound]);

  const fetchChildren = useCallback(async (phoneNumber) => {
    if (!phoneNumber) return;

    setLoadingChildren(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/chatbot/children", { 
        phone: phoneNumber 
      });
      setChildren(response.data);
      localStorage.setItem("childList", JSON.stringify(response.data));

      const initialVisibleActions = {};
      response.data.forEach(child => {
        initialVisibleActions[child.id] = false;
      });
      setVisibleActions(initialVisibleActions);
    } catch (err) {
      console.error("Fetch children error:", err);
      setError(t.fetchChildrenError);
    } finally {
      setLoadingChildren(false);
    }
  }, [t.fetchChildrenError]);

  const fetchParentName = useCallback(async (phoneNumber) => {
    try {
      const res = await axios.post("http://localhost:5000/chatbot/get_parent_name", { 
        phone: phoneNumber 
      });
      if (res.data?.parent_name) {
        setParentName(res.data.parent_name);
        localStorage.setItem("parentName", res.data.parent_name);
      } else {
        setParentName(null);
        localStorage.removeItem("parentName");
      }
    } catch (err) {
      console.error("Failed to fetch parent name:", err);
      setParentName(null);
      localStorage.removeItem("parentName");
    }
  }, []);

  const fetchUserLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const res = await axios.get("http://localhost:5000/api/userinfo");
      setRegion(res.data.region || t.unknownRegion);
      setCountry(res.data.country?.trim() || t.unknownCountry);
    } catch (err) {
      console.error("Failed to fetch location:", err);
      setRegion(t.unknownRegion);
      setCountry(t.unknownCountry);
    } finally {
      setLoadingLocation(false);
    }
  }, [t.unknownRegion, t.unknownCountry]);

  useEffect(() => {
    if (phone) {
      fetchChildren(phone);
      fetchParentName(phone);
    }
  }, [phone, fetchChildren, fetchParentName, location]);

  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  useEffect(() => {
    if (location.state?.refresh && phone) {
      fetchChildren(phone);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, phone, fetchChildren]);

  const startChat = (child) => {
    localStorage.removeItem("childInfo");
    localStorage.setItem("childInfo", JSON.stringify({ ...child, phone }));
    navigate("/chatbot");
  };

  const handleDelete = async (childId) => {
    if (window.confirm(t.deleteConfirm)) {
      try {
        await axios.delete(`http://localhost:5000/chatbot/children/${childId}`);
        fetchChildren(phone);
      } catch (error) {
        console.error("Delete error:", error);
        setError(t.deleteChildError);
      }
    }
  };

  const goToNewEntry = () => navigate("/new-child");

  const getGenderBadgeClass = (gender) => {
    const lowerGender = gender?.toLowerCase();
    if (lowerGender === 'male') return 'gender-male';
    if (lowerGender === 'female') return 'gender-female';
    return 'gender-other';
  };

  return (
    <div className="main-wrapper-two5">
      <input
        ref={dummyInputRef}
        type="text"
        placeholder="Hidden dummy input"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
      />

      <div className="sidebar">
        <ul>
          <li onClick={() => navigate("/")} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IoMdHome size={35} />{t.home}
          </li>
          <li onClick={goToNewEntry} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IoIosAddCircle size={35} />{t.addChild}
          </li>
          <li onClick={() => navigate("/signin", { state: { lang: language } })} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <LogOut size={30} />{t.signOut}
          </li>
        </ul>
      </div>

      <div className="signin-wrapper5">
        <div className="form-container2">
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
                <span className="curve-text5">{t.childInfo}</span>
              </div>
              {error && <div className="general-error">{error}</div>}
              <div className="curve-right-section">
                {t.signedInAs} {parentName || t.loading}
                <span>{loadingLocation ? t.loadingLocation : `${region}, ${country}`}</span>
              </div>
            </div>
          </div>

          <div className="content-area">
            {loadingChildren ? (
              <div className="loading-container">
                <div>{t.loadingChildren}</div>
              </div>
            ) : children.length > 0 ? (
              <>
                <h2>{t.childrenInfo}</h2>
                <div className="child-table-container">
                  <table className="child-table">
                    <thead>
                      <tr>
                        <th>{t.name}</th>
                        <th>{t.age}</th>
                        <th>{t.gender}</th>
                        <th>{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={child.id}>
                          <td className="child-name-cell"><strong>{child.name}</strong></td>
                          <td>
                            <span className="age-display">{child.age !== null ? `${child.age}` : "N/A"}</span>
                          </td>
                          <td>
                            <span className={`gender-badge ${getGenderBadgeClass(child.gender)}`}>
                              {child.gender}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-chat" onClick={() => startChat(child)}>
                                <IoIosChatboxes size={20} color="black" />
                              </button>
                              <button className="btn-milestone" onClick={() => {
                                localStorage.setItem("childInfo", JSON.stringify(child));
                                navigate("/milestone");
                              }}>
                                📊
                              </button>
                              <button className="btn-bmi" onClick={() => {
                                localStorage.setItem("childInfo", JSON.stringify(child));
                                navigate("/bmicheck");
                              }}>
                                📏
                              </button>
                              <button className="btn-delete" onClick={() => handleDelete(child.id)}>
                                <MdDelete size={20} color="black" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h2>{t.noChildren}</h2>
                <p>{t.addPrompt}</p>
                <button onClick={goToNewEntry}>{t.addButton}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChildInfo;