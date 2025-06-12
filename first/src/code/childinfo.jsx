import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./ChildInfo.css";
import { Volume2, Mic, LogOut } from "lucide-react";
import { IoIosChatboxes } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { IoIosAddCircle } from "react-icons/io";
// You might need to import a specific icon for the '...' button,
// or use a character like '...' directly. For demonstration, I'll use a placeholder.
import { BsThreeDotsVertical } from "react-icons/bs"; // Example icon for the three dots

function ChildInfo() {
  const [phone, setPhone] = useState(null);
  const [parentName, setParentName] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");


  // State to manage the visibility of action buttons for each child
  const [visibleActions, setVisibleActions] = useState({});
  


  // ✅ Ref for the dummy hidden input
  const dummyInputRef = useRef(null);

  // ✅ Focus on the hidden input when component mounts
  useEffect(() => {
    if (dummyInputRef.current) {
      dummyInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const savedPhone = localStorage.getItem("phone");
    if (savedPhone) {
      setPhone(savedPhone);
    } else {
      setError("Phone not found. Redirecting to login...");
      setTimeout(() => navigate("/"), 2000);
    }
  }, [navigate]);

  const fetchChildren = async (phoneNumber) => {
    if (!phoneNumber) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/chatbot/children", { phone: phoneNumber });
      setChildren(response.data);
      localStorage.setItem("childList", JSON.stringify(response.data)); // ✅ Add this line

      // Initialize visibleActions state for each child
      const initialVisibleActions = {};
      response.data.forEach(child => {
        initialVisibleActions[child.id] = false;
      });
      setVisibleActions(initialVisibleActions);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch children.");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentName = async (phoneNumber) => {
    try {
      const res = await axios.post("http://localhost:5000/chatbot/get_parent_name", { phone: phoneNumber });
      if (res.data?.parent_name) {
        setParentName(res.data.parent_name);
      }
    } catch (err) {
      console.error("Failed to fetch parent name:", err);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchChildren(phone);
      fetchParentName(phone);
    }
  }, [phone]);

  useEffect(() => {
    if (location.state?.refresh && phone) {
      fetchChildren(phone);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, phone]);
  /*useEffect(() => {
  const fetchUserLocation = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/userinfo");
      setRegion(res.data.region || "Unknown Region");
      setCountry(res.data.country?.trim() || "Unknown Country");

    } catch (err) {
      console.error("Failed to fetch user location", err);
    }
  };

  fetchUserLocation();
}, []);*/
useEffect(() => {
  // ✅ Hardcoded location values for demonstration purposes
  setRegion("Karnataka");
  setCountry("India");
}, []);



  const startChat = (child) => {
    localStorage.setItem("childInfo", JSON.stringify({ ...child, phone }));
    navigate("/chatbot");
  };

  
  const handleDelete = async (childId) => {
    if (window.confirm("Are you sure you want to delete this child?")) {
      try {
        await axios.delete(`http://localhost:5000/chatbot/children/${childId}`);
        fetchChildren(phone);
      } catch (error) {
        console.error("Delete error:", error);
        setError("Failed to delete child.");
      }
    }
  };

  const goToNewEntry = () => {
    navigate("/new-child");
  };

  const getGenderBadgeClass = (gender) => {
    const lowerGender = gender?.toLowerCase();
    if (lowerGender === 'male') return 'gender-male';
    if (lowerGender === 'female') return 'gender-female';
    return 'gender-other';
  };

  // Function to toggle action button visibility for a specific child
  const toggleActionButtons = (childId) => {
    setVisibleActions(prev => ({
      ...prev,
      [childId]: !prev[childId]
    }));
  };

  return (
    <div className="main-wrapper-two5">
      {/* ✅ Hidden dummy input field */}
      <input
        ref={dummyInputRef}
        type="text"
        placeholder="Hidden dummy input"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
      />

      <div className="sidebar">
        <ul>
          <li onClick={() => navigate("/") }style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IoMdHome size={35}/>Home
          </li>
          <li onClick={goToNewEntry} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IoIosAddCircle size={35}/>Add Child 
          </li>
          <li onClick={() => navigate("/signin", { state: { lang: 'en' } })} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <LogOut size={30} />Sign Out
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
                <span className="curve-text5">CHILD INFORMATION</span>
              </div>
              {error && <div className="general-error">{error}</div>}
              <div className="curve-right-section">
                Signed in as {parentName || "Loading..."}
                <span>{region}, {country}</span>

              </div>
            </div>
          </div>

          <div className="content-area">
            {loading ? (
              <div className="loading-container">
                <div>Loading children...</div>
              </div>
            ) : children.length > 0 ? (
              <>
                <h2>Children Information</h2>
                
                <div className="child-table-container">
                  <table className="child-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Age In Months</th>
                        <th>Gender</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={child.id}>
                          <td className="child-name-cell"><strong>{child.name}</strong></td>
                          <td>
                            <span className="age-display">
                              {child.age !== null ? `${child.age}` : "N/A"}
                            </span>
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
      localStorage.setItem("childInfo", JSON.stringify(child)); // Pass child info
      navigate("/milestone");
    }}>
      📊
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
                <h2>No children found</h2>
                <p>Start by adding your first child's information to begin tracking their development.</p>
                <button onClick={goToNewEntry}>➕ Add New Child</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChildInfo;