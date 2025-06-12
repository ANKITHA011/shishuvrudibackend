import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import './bmiy.css';
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";

// --- SimpleHeader Component ---
const SimpleHeader = ({ parentName }) => (
    <div className="simple-header">
        <div className="header-left">
            <img src="/baby-icon.png" alt="Baby Icon" className="baby-icon" />
            <span className="app-title">Shishu Vriddhi</span>
        </div>
        <div className="header-right">
            <div className="signed-in">Signed in as {parentName || "Loading..."}</div>
        </div>
    </div>
);

// --- AssessmentDialog Component ---
const AssessmentDialog = ({
    childInfo, formatAge, height, setHeight, weight, setWeight,
    handleAssessment, assessmentResult, idealRanges, loading,
    error, setAssessmentResult, onClose
}) => (
    <div className="dialog-overlay">
        <div className="dialog-content">
            <button className="dialog-close-btn" onClick={onClose}>&times;</button>
            <h2>CGM Assessment</h2>
            {childInfo ? (
                <><div className="child-info-display"> {/* Child info will be on the left */}
                            <span><strong>Child Name:</strong> {childInfo?.name || "No child selected"}</span>
                            <span><strong>Age in Months:</strong> {childInfo ? childInfo.age : "N/A"}</span>
                        </div>
                    {!assessmentResult ? (
                        <>
                            <div className="input-group">
                                <label htmlFor="height">Height (cm):</label>
                                <input id="height" type="number" value={height}
                                    onChange={(e) => setHeight(e.target.value)} placeholder="e.g., 75.5" />
                            </div>

                            <div className="input-group">
                                <label htmlFor="weight">Weight (kg):</label>
                                <input id="weight" type="number" value={weight}
                                    onChange={(e) => setWeight(e.target.value)} placeholder="e.g., 9.2" />
                            </div>

                            {error && <div className="error-box">{error}</div>}

                            <button className="submit-btn" onClick={handleAssessment} disabled={loading}>
                                {loading ? "Assessing..." : "Get Assessment"}
                            </button>
                        </>
                    ) : (
                        <div className="result-box">
                            <h3>Assessment Results</h3>
                            <div className="status-results">
                                <div className="status-item">
                                    <span className="status-label">Height Status:</span>
                                    <span className="status-value">
                                        {assessmentResult.height_status}
                                        {idealRanges && ` (${idealRanges.height_min} - ${idealRanges.height_max} cm)`}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Weight Status:</span>
                                    <span className="status-value">
                                        {assessmentResult.weight_status}
                                        {idealRanges && ` (${idealRanges.weight_min} - ${idealRanges.weight_max} kg)`}
                                    </span>
                                </div>
                            </div>
                            <div className="recommendation-section">
                                <h4>Recommendation:</h4>
                                <div className="recommendation-text">
                                    {assessmentResult.recommendation}
                                </div>
                            </div>
                            <button className="submit-btn" onClick={() => setAssessmentResult(null)}>
                                New Assessment
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="loading-state">
                    <p>Loading child information...</p>
                </div>
            )}
        </div>
    </div>
);

// --- BMICheck Component ---
function BMICheck() {
    const navigate = useNavigate();
    const location = useLocation();
    const [childInfo, setChildInfo] = useState(null);
    const [parentName, setParentName] = useState(localStorage.getItem("parentName") || "Loading...");
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [assessmentResult, setAssessmentResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [idealRanges, setIdealRanges] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [pastAssessments, setPastAssessments] = useState([]);
    const [pastAssessmentsLoading, setPastAssessmentsLoading] = useState(true);
    const [pastAssessmentsError, setPastAssessmentsError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [assessmentsPerPage] = useState(8); // Number of assessments per page

    useEffect(() => {
        const info = location.state?.childInfo || JSON.parse(localStorage.getItem("childInfo"));
        if (info) {
            if (!info.phone) {
                setError("Child information is incomplete. Phone number is missing. Please update child information.");
                setTimeout(() => navigate("/child-info"), 2000);
                return;
            }
            setChildInfo(info);
        } else {
            setError("Child information not found. Please select a child first.");
            setTimeout(() => navigate("/child-info"), 2000);
        }

        const storedParentName = localStorage.getItem("parentName");
        if (storedParentName && storedParentName !== parentName) {
            setParentName(storedParentName);
        }
    }, [location.state, navigate, parentName]);

    useEffect(() => {
        const fetchPastAssessments = async () => {
            if (childInfo && childInfo.phone && childInfo.name) {
                setPastAssessmentsLoading(true);
                setPastAssessmentsError('');
                try {
                    const response = await axios.get("http://localhost:5000/chatbot/child_assessments", {
                        params: {
                            phone: childInfo.phone,
                            name: childInfo.name
                        }
                    });
                    setPastAssessments(response.data);
                } catch (err) {
                    console.error("Error fetching past assessments:", err.response?.data || err.message);
                    setPastAssessmentsError("Failed to load past assessments. Please try again.");
                } finally {
                    setPastAssessmentsLoading(false);
                }
            }
        };

        fetchPastAssessments();
    }, [childInfo]);

    const openAssessmentDialog = () => {
        if (!childInfo || !childInfo.phone) {
            setError("Cannot open assessment. Child's phone number is missing. Please update child information.");
            return;
        }
        setShowDialog(true);
        setHeight('');
        setWeight('');
        setAssessmentResult(null);
        setError('');
        setIdealRanges(null);
    };

    const closeAssessmentDialog = () => {
        setShowDialog(false);
        setHeight('');
        setWeight('');
        setAssessmentResult(null);
        setError('');
        setIdealRanges(null);
        // Refresh past assessments after closing the dialog if a new assessment was added
        if (assessmentResult) { // Only refresh if an assessment was successfully made
            const info = { ...childInfo };
            setChildInfo(info); // This will trigger the useEffect to refetch assessments
        }
    };

    const formatAge = (totalMonths) => {
        if (totalMonths == null) return "N/A";
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        let result = [];
        if (years) result.push(`${years} year${years > 1 ? 's' : ''}`);
        if (months) result.push(`${months} month${months > 1 ? 's' : ''}`);
        return result.join(', ') || "Less than 1 month";
    };

    const handleAssessment = async () => {
        if (!childInfo || !height || !weight) {
            setError("Please fill all fields.");
            return;
        }

        if (!childInfo.phone) {
            setError("Phone number is missing for this child. Please update child information.");
            return;
        }

        setLoading(true);
        setError('');
        setAssessmentResult(null);
        setIdealRanges(null);

        try {
            const res = await axios.post("http://localhost:5000/chatbot/child_assessment", {
                name: childInfo.name,
                age: childInfo.age,
                gender: childInfo.gender,
                phone: childInfo.phone,
                height: parseFloat(height),
                weight: parseFloat(weight)
            });

            setAssessmentResult(res.data);

            if (
                res.data.ideal_height_min &&
                res.data.ideal_height_max &&
                res.data.ideal_weight_min &&
                res.data.ideal_weight_max
            ) {
                setIdealRanges({
                    height_min: res.data.ideal_height_min,
                    height_max: res.data.ideal_height_max,
                    weight_min: res.data.ideal_weight_min,
                    weight_max: res.data.ideal_weight_max,
                });
            }
        } catch (err) {
            console.error("Assessment API error:", err.response?.data || err.message);
            setError(err.response?.data?.error || "Assessment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const indexOfLastAssessment = currentPage * assessmentsPerPage;
    const indexOfFirstAssessment = indexOfLastAssessment - assessmentsPerPage;
    const currentAssessments = pastAssessments.slice(indexOfFirstAssessment, indexOfLastAssessment);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const nextPage = () => {
        if (currentPage < Math.ceil(pastAssessments.length / assessmentsPerPage)) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="bmi-outer-container">
            <SimpleHeader parentName={parentName} />
            <div className="bmi-content-area">
                <div className="navbar15">
                    <ul>
                        <li onClick={() => navigate("/")} className="nav-item15"><IoMdHome size={35}/>Home</li>
                        <li onClick={() => navigate("/child-info")} className="nav-item15"><PiBabyBold size={35}/>Child Info</li>
                        <li onClick={() => navigate("/chatbot")} className="nav-item15"><IoChatbubbleEllipsesSharp size={35}/>Chat</li>
                        <li onClick={() => navigate("/milestone")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}className="nav-item15"><span style={{ fontSize: "1.5em" }}>📊</span>Milestone</li>
                        <li onClick={() => navigate("/signin", { state: { lang: "en" } })} className="nav-item15"
                            style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            <LogOut size={35}/>Sign Out
                        </li>
                    </ul>
                </div>

                <div className="main-content-display">
                    {/* Move the child info and assessment button into a header-like section within main-content-display */}
                    <div className="child-assessment-header"> {/* New div for horizontal layout */}
                        <div className="child-info-display"> {/* Child info will be on the left */}
                            <span><strong>Child Name:</strong> {childInfo?.name || "No child selected"}</span>
                            <span><strong>Age in Months:</strong> {childInfo ? childInfo.age : "N/A"}</span>
                        </div>
                        <button className="add-assessment-btn" onClick={openAssessmentDialog} disabled={!childInfo || !childInfo.phone}>
                            Add CGM
                        </button>
                    </div>
                    
                    {error && <div style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>{error}</div>}

                    <div className="previous-assessments">
                        {pastAssessmentsLoading ? (
                            <p>Loading past assessments...</p>
                        ) : pastAssessmentsError ? (
                            <p style={{ color: 'red' }}>{pastAssessmentsError}</p>
                        ) : pastAssessments.length > 0 ? (
                            <>
                                <table className="assessments-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Height (cm)</th>
                                            <th>Weight (kg)</th>
                                        
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentAssessments.map((assessment, index) => (
                                            <tr key={index}>
                                                <td>{new Date(assessment.assessment_date).toLocaleDateString('en-IN', {year: 'numeric',month: 'short',day: 'numeric',timeZone: 'UTC'  // or use your desired timezone like 'Asia/Kolkata'
})}</td>

                                                <td>{assessment.height_cm}</td>
                                                <td>{assessment.weight_kg}</td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="pagination">
                                    <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
                                    <span>Page {currentPage} of {Math.ceil(pastAssessments.length / assessmentsPerPage)}</span>
                                    <button onClick={nextPage} disabled={currentPage === Math.ceil(pastAssessments.length / assessmentsPerPage)}>Next</button>
                                </div>
                            </>
                        ) : (
                            <p>No past assessments available for {childInfo?.name || "this child"}.</p>
                        )}
                    </div>
                </div>
            </div>

            {showDialog && (
                <AssessmentDialog
                    childInfo={childInfo}
                    formatAge={formatAge}
                    height={height}
                    setHeight={setHeight}
                    weight={weight}
                    setWeight={setWeight}
                    handleAssessment={handleAssessment}
                    assessmentResult={assessmentResult}
                    idealRanges={idealRanges}
                    loading={loading}
                    error={error}
                    setAssessmentResult={setAssessmentResult}
                    onClose={closeAssessmentDialog}
                />
            )}
        </div>
    );
}

export default BMICheck;