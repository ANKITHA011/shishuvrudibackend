// ...imports remain unchanged
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { GrView } from "react-icons/gr";
import axios from "axios";
import "./DoctorDashboard.css";

const CurveHeader = ({ doctorName }) => (
  <div className="curve-separator5">
    <svg viewBox="0 0 500 80" preserveAspectRatio="none">
      <path
        d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z"
        className="wave-wave-back5"
      />
      <path
        d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z"
        className="wave wave-front5"
      />
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
        <div className="child-info-line">Signed in as {doctorName}</div>
      </div>
    </div>
  </div>
);

const DoctorDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [doctorName, setDoctorName] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const doctorPhone = localStorage.getItem("phone");

  const [timerNow, setTimerNow] = useState(Date.now());

  const fetchDoctorName = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/chatbot/doctor_name/${doctorPhone}`
      );
      setDoctorName(res.data?.doctor_name || doctorPhone);
    } catch (err) {
      console.error("Failed to fetch doctor name:", err);
      setDoctorName(doctorPhone);
    }
  }, [doctorPhone]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/chatbot/chatbot/notifications/${doctorPhone}`
      );
      const notificationsData = res.data;

      const enhancedNotifications = await Promise.all(
        notificationsData.map(async (notif) => {
          let childName = "N/A";
          let childAge = "N/A";
          let childGender = "N/A";
          let parentName = "N/A";

          try {
            const childRes = await axios.get(
              `http://localhost:5000/chatbot/child/info/${notif.child_id}`
            );
            const child = childRes.data;
            childName = child.name;
            childAge = child.age;
            childGender = child.gender;
            parentName = child.parent_name;
          } catch (err) {
            console.error(
              `Error fetching child info for child_id ${notif.child_id}:`,
              err
            );
          }

          return {
            ...notif,
            childName,
            childAge,
            childGender,
            parentName,
          };
        })
      );

      setNotifications(enhancedNotifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [doctorPhone]);

  useEffect(() => {
    if (!doctorPhone) {
      navigate("/signin");
      return;
    }

    fetchNotifications();
    fetchDoctorName();

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [doctorPhone, fetchNotifications, fetchDoctorName, navigate]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const formatWaitingTime = (timestamp) => {
    if (!timestamp) return "N/A";

    const createdTime = new Date(timestamp);
    const diffMs = timerNow - createdTime;
    if (diffMs < 0) return "0m 0s";

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  const getWaitingTimeDisplay = (notif) => {
    if (
      notif.chatnotiactionatkenbydoctor === "yes" &&
      notif.final_waiting_time
    ) {
      return `${notif.final_waiting_time} (Started)`;
    }
    return formatWaitingTime(notif.timestamp);
  };

  const handleReply = async (childId) => {
    const notification = notifications.find((n) => n.child_id === childId);
    if (!notification) return;

    const createdTime = new Date(notification.timestamp);
    const diffMs = Date.now() - createdTime;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    const finalWaitingTime = `${minutes}m ${seconds}s`;

    try {
      await axios.post("http://localhost:5000/chatbot/notification/action_taken", {
        child_id: childId,
        doctor_id: doctorPhone,
        final_waiting_time: finalWaitingTime,
      });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to update action_taken status:", err);
    }

    navigate(`/parentchat/${childId}/Parent/${doctorPhone}`);
  };

  const handleView = async (notification) => {
    try {
      await axios.post("http://localhost:5000/chatbot/notification/mark_seen", {
        child_id: notification.child_id,
        doctor_id: doctorPhone,
      });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to update seen status:", err);
    }

    setSelectedNotification(notification);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  return (
    <div className="page-layout">
      <CurveHeader doctorName={doctorName} />

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
                      <td>
                        {(item.timestamp)}
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              item.chatnotiactionatkenbydoctor === "yes"
                                ? "green"
                                : "red",
                            fontWeight: "bold",
                          }}
                        >
                          {getWaitingTimeDisplay(item)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="reply-button"
                          onClick={() => handleReply(item.child_id)}
                        >
                          Chat Now
                        </button>
                        <button
                          className="view-button"
                          onClick={() => handleView(item)}
                          aria-label="View Notification"
                        >
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
            <button className="close-button" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
