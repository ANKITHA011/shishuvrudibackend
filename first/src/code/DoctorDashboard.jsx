import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { GrView } from "react-icons/gr";
import axios from "axios";
import "./DoctorDashboard.css";

const CurveHeader = ({ doctorName, isOnline }) => (
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
        <span className="curve-text5">NOTIFICATION</span>
      </div>
      <div className="curve-right-section">
        <div className="child-info-line">
          Signed in as {doctorName}
          <span style={{ marginLeft: "10px", color: isOnline ? "green" : "gray", fontWeight: "bold" }}>
            ● {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const DoctorDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [doctorName, setDoctorName] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);

  const navigate = useNavigate();
  const doctorPhone = localStorage.getItem("phone");

  let inactivityTimeout = null;

  const updateLastAction = useCallback(async (isActive = true) => {
    try {
      await axios.post(`http://localhost:5000/chatbot/update_last_action/${doctorPhone}`, {
        available: isActive
      });
    } catch (err) {
      console.error("Error updating last action time:", err);
    }
  }, [doctorPhone]);

  const handleUserActivity = useCallback(() => {
    if (!isUserActive) {
      setIsUserActive(true);
      updateLastAction(true); // Became active again
    }

    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      setIsUserActive(false);
      updateLastAction(false); // Became inactive
    }, 5000);
  }, [isUserActive, updateLastAction]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, handleUserActivity));

    return () => {
      events.forEach(e => window.removeEventListener(e, handleUserActivity));
      clearTimeout(inactivityTimeout);
    };
  }, [handleUserActivity]);

  const fetchDoctorName = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/chatbot/doctor_name/${doctorPhone}`);
      setDoctorName(res.data?.doctor_name || doctorPhone);
    } catch {
      setDoctorName(doctorPhone);
    }
  }, [doctorPhone]);

  const fetchActionStatuses = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/chatbot/notification/action_status/${doctorPhone}`);
      return res.data || [];
    } catch {
      return [];
    }
  }, [doctorPhone]);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, actionStatusList] = await Promise.all([
        axios.get(`http://localhost:5000/chatbot/chatbot/notifications/${doctorPhone}`),
        fetchActionStatuses()
      ]);

      const actionStatusMap = new Map();
      actionStatusList.forEach(status => {
        actionStatusMap.set(status.chatnotichildid, status);
      });

      const enhanced = await Promise.all(notifRes.data.map(async notif => {
        let child = {};
        try {
          const res = await axios.get(`http://localhost:5000/chatbot/child/info/${notif.child_id}`);
          child = res.data;
        } catch {}

        const actionData = actionStatusMap.get(notif.child_id);
        return {
          ...notif,
          childName: child.name || "N/A",
          childAge: child.age || "N/A",
          childGender: child.gender || "N/A",
          parentName: child.parent_name || "N/A",
          chatnotiactionatkenbydoctor: actionData?.chatnotiactionatkenbydoctor || "no",
          action_time: actionData?.action_time || null
        };
      }));

      setNotifications(enhanced);
    } catch (err) {
      console.error("Fetch notifications failed:", err);
    }
  }, [doctorPhone, fetchActionStatuses]);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/chatbot/doctor/availability/${doctorPhone}`);
      setIsOnline(res.data.available);
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    }
  }, [doctorPhone]);

  useEffect(() => {
    if (!doctorPhone) {
      navigate("/signin");
      return;
    }

    fetchDoctorName();
    fetchNotifications();
    fetchAvailability();
    updateLastAction(true); // Initial

    const interval = setInterval(() => {
      fetchNotifications();
      fetchAvailability();
      if (isUserActive) updateLastAction(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [doctorPhone, isUserActive, fetchDoctorName, fetchNotifications, fetchAvailability, updateLastAction, navigate]);

  useEffect(() => {
    const t = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatActionTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };

  const formatWaitingTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const created = new Date(timestamp);
    const diffMs = timerNow - created;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const handleReply = async (childId) => {
    const notification = notifications.find(n => n.child_id === childId);
    if (!notification) return;

    const created = new Date(notification.timestamp);
    const diff = Date.now() - created;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const finalWait = `${mins}m ${secs}s`;

    try {
      await axios.post("http://localhost:5000/chatbot/notification/action_taken", {
        child_id: childId,
        doctor_id: doctorPhone,
        final_waiting_time: finalWait,
      });
      await fetchNotifications();
      navigate(`/parentchat/${childId}/Parent/${doctorPhone}`);
    } catch (err) {
      console.error("Reply failed:", err);
    }
  };

  const handleView = async (notification) => {
    try {
      await axios.post("http://localhost:5000/chatbot/notification/mark_seen", {
        child_id: notification.child_id,
        doctor_id: doctorPhone,
      });
      await fetchNotifications();
      setSelectedNotification(notification);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to mark as seen:", err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  return (
    <div className="page-layout">
      <CurveHeader doctorName={doctorName} isOnline={isOnline} />

      <div className="left-nav1">
        <ul>
          <li onClick={() => navigate("/")}>
            <IoMdHome size={24} /> Home
          </li>
          <li onClick={() => navigate("/signin")}>
            <LogOut size={24} /> Sign Out
          </li>
        </ul>
      </div>

      <div className="doctor-dashboard-container">
        <h2 className="dashboard-header">Notifications</h2>
        {notifications.length === 0 ? (
          <div className="no-notifications">No new notifications</div>
        ) : (
          <div className="notification-table-wrapper">
            <table className="notification-table">
              <thead>
                <tr>
                  <th>Child Name</th>
                  <th>Gender</th>
                  <th>Child Age</th>
                  <th>Date</th>
                  <th>Waiting Time</th>
                  <th>Action</th>
                </tr>
              </thead>
            </table>
            <div className="notification-table-body">
              <table className="notification-table">
                <tbody>
                  {notifications.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.childName}</td>
                      <td>{item.childGender}</td>
                      <td>{item.childAge}</td>
                      <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          color: item.chatnotiactionatkenbydoctor === "yes" ? "black" : "red",
                          fontWeight: "bold"
                        }}>
                          {item.chatnotiactionatkenbydoctor === "yes" ? "Viewed" : formatWaitingTime(item.timestamp)}
                        </span>
                      </td>
                      <td>
                        <button className="reply-button" onClick={() => handleReply(item.child_id)}>Chat Now</button>
                        <button className="view-button" onClick={() => handleView(item)} aria-label="View Notification">
                          <GrView size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && selectedNotification && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Notification Details</h3>
            <p><strong>Child Name:</strong> {selectedNotification.childName}</p>
            <p><strong>Age:</strong> {selectedNotification.childAge}</p>
            <p><strong>Gender:</strong> {selectedNotification.childGender}</p>
            <p><strong>Action Taken:</strong> {selectedNotification.chatnotiactionatkenbydoctor === "yes" ? "Yes" : "No"}</p>
            <p><strong>Action Time:</strong> {selectedNotification.action_time ? formatActionTime(selectedNotification.action_time) : "N/A"}</p>
            <button className="close-button" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
