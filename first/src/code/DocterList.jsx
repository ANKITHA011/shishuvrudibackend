import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Docterlist.css';
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";

// Format timestamp (if needed)
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
          <img src="/baby-icon.png" alt="Baby Icon" />
        </div>
        <span className="curve-app-title">Shishu Vriddhi</span>
      </div>
      <div className="curve-middle-section">
        <span className="curve-text5">AVAILABLE DOCTORS</span>
      </div>
      <div className="curve-right-section">
        {childInfo && (
          <div>
            <div className="child-info-line">Sign in as {parentName || "Loading..."}</div>
            <span>{region}, {country}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const dialogRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [childInfo, setChildInfo] = useState(location.state?.childInfo || null);
  const [parentName, setParentName] = useState(localStorage.getItem("parentName") || null);
  const [childList, setChildList] = useState(JSON.parse(localStorage.getItem("childList")) || []);
  const [userRegion, setUserRegion] = useState("Loading...");
  const [userCountry, setUserCountry] = useState("Loading...");

  useEffect(() => {
    axios.get('http://localhost:5000/chatbot/doctors')
      .then(res => {
        setDoctors(res.data);
        dialogRef.current?.showModal();
      })
      .catch(err => console.error("Error fetching doctors:", err));

    const info = JSON.parse(localStorage.getItem("childInfo"));
    setChildInfo(info);

    const cachedParentName = localStorage.getItem("parentName");
    if (cachedParentName) setParentName(cachedParentName);

    const cachedChildList = JSON.parse(localStorage.getItem("childList"));
    if (cachedChildList) setChildList(cachedChildList);

    if (info?.phone) fetchParentName(info.phone);
    fetchUserInfo();
  }, []);

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

  const fetchUserInfo = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/userinfo");
      setUserRegion(res.data.region);
      setUserCountry(res.data.country);
    } catch (err) {
      console.error("Error fetching user info:", err);
      setUserRegion("Unknown");
      setUserCountry("Unknown");
    }
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleStartChat = async (doctor) => {
    try {
      const doctorPhone = doctor.phone_number;
      const childId = childInfo?.id;

      // 🔔 Create chat notification in DB
      await axios.post("http://localhost:5000/chatbot/create_chat_notification", {
        child_id: childId,
        doctor_id: doctorPhone
      });

      // 👨‍⚕️ Navigate to chat screen
      navigate('/doctorchat', { state: { doctor, childInfo } });
    } catch (error) {
      console.error("Error starting chat or inserting notification:", error);
      alert("Error: Could not initiate chat.");
    }
  };

  const handleChildSwitch = (selectedId) => {
    const selected = childList.find(c => c.id == selectedId);
    if (selected) {
      const updatedChild = { ...selected, phone: childInfo.phone };
      localStorage.setItem("childInfo", JSON.stringify(updatedChild));
      setChildInfo(updatedChild);
    }
  };

  return (
    <div className="page-layout">
      <CurveHeader childInfo={childInfo} parentName={parentName} region={userRegion} country={userCountry} />

      <div className="left-nav1">
        <ul>
          <li onClick={() => navigate("/")}><IoMdHome size={35} />Home</li>
          <li onClick={() => navigate("/child-info")}><PiBabyBold size={35} />Child Info</li>
          <li onClick={() => navigate("/milestone")}>📊 Milestone</li>
          <li onClick={() => navigate("/bmicheck")}>📏 CGM</li>
          <li onClick={() => navigate("/signin", { state: { lang: 'en' } })}><LogOut size={30} />Sign Out</li>
        </ul>
      </div>

      {childInfo && (
        <div className="fixed-child-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <span><strong>Child Name:</strong> {childInfo.name}</span>
            <span><strong>Age:</strong> {childInfo.age}</span>
          </div>
        </div>
      )}

      <div className="main-wrapper3" style={{ marginTop: '150px' }}>
        <dialog ref={dialogRef} className="doctor-dialog">
          <h2>Available Doctors</h2>
          <div className="doctor-list">
            {doctors.map((doc) => (
              <div key={doc.doctor_id} className="doctor-card">
                <p><strong>Name:</strong> {doc.doctor_name}</p>
                <p><strong>Email:</strong> {doc.email_id}</p>
                <p><strong>Phone:</strong> {doc.phone_number}</p>
                <button
                  onClick={() => handleStartChat(doc)}
                  className="chat-button"
                >
                  Start Chat
                </button>
              </div>
            ))}
          </div>
          <button className="close-dialog-button" onClick={handleClose}>Close</button>
        </dialog>
      </div>
    </div>
  );
}

export default DoctorList;
