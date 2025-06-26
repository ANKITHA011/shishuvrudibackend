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
            <div className="dialog-header">
    <img src="/baby-icon.png" alt="Baby Icon" className="dialog-baby-icon" />
    <h3 className="dialog-title">Shishu Vriddhi</h3>
</div>

            <button className="dialog-close-btn" onClick={onClose}>&times;</button>
            <h2>CGM Assessment</h2>
            {childInfo ? (
                <>   
                    <div className="child-info-display">
                        <span><strong>Child Name:</strong> {childInfo?.name || "No child selected"}</span>
                        {/* Display the formatted age for the user */}
                        <span><strong>Age:</strong> {formatAge(childInfo.age)}</span>
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
                                    <span className="status-label">Child Height:</span>
                                    <span className="status-value">{height} cm</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Child Weight:</span>
                                    <span className="status-value">{weight} kg</span>
                                </div>
                            </div>
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

    // Helper to parse age string (e.g., "0 years, 0 months, 3 days") into total months
    // Helper to parse age string (e.g., "2 m, 15 d") and extract *only* the month component.
const parseAgeStringToMonths = (ageString) => {
    if (!ageString) {
        return 0; // Return 0 if the age string is empty or null
    }

    // Use a regular expression to find the number followed by 'm' (for months)
    // This is more robust than splitting by comma if the format slightly changes
    const match = ageString.match(/(\d+)\s*m/);

    if (match && match[1]) {
        // If a match is found, parse the captured number as an integer
        return parseInt(match[1], 10);
    }

    return 0; // Return 0 if no month value is found in the string
};

    useEffect(() => {
        const info = location.state?.childInfo || JSON.parse(localStorage.getItem("childInfo"));
        if (info) {
            // Parse the age string into total months here for backend compatibility
            const ageInMonths = parseAgeStringToMonths(info.age);
            setChildInfo({ ...info, age: ageInMonths });
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
            if (childInfo && childInfo.id && childInfo.name) {
                setPastAssessmentsLoading(true);
                setPastAssessmentsError('');
                try {
                    const response = await axios.get("http://localhost:5000/chatbot/child_assessments", {
                        params: {
                            id: childInfo.id,
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

        // Only fetch if childInfo.id is available
        if (childInfo?.id) {
            fetchPastAssessments();
        }
    }, [childInfo]); // Depend on childInfo to refetch when it changes (e.g., ID is set)

    const openAssessmentDialog = () => {
        if (!childInfo || !childInfo.id) {
            setError("Cannot open assessment. Child information is incomplete. Please select a child with a valid ID.");
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
        if (assessmentResult) {
            const info = { ...childInfo };
            setChildInfo(info); // This will trigger the useEffect to refetch assessments
        }
    };

    // This function is for display purposes, converting numeric months back to readable format
    const formatAge = (totalMonths) => {
        if (totalMonths == null) return "N/A";
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        let result = [];
        if (years) result.push(`${years} year${years > 1 ? 's' : ''}`);
        if (months) result.push(`${months} month${months > 1 ? 's' : ''}`);
        return result.join(', ') || "Less than 1 month"; // Handles 0 months correctly
    };

    const handleAssessment = async () => {
        if (!childInfo || !childInfo.id || height === '' || weight === '') {
            setError("Please fill all fields and ensure child information is complete.");
            return;
        }

        setLoading(true);
        setError('');
        setAssessmentResult(null);
        setIdealRanges(null);

        try {
            const res = await axios.post("http://localhost:5000/chatbot/child_assessment", {
                id: childInfo.id, // Ensure child ID is sent
                name: childInfo.name,
                age: childInfo.age, // This will now be the numeric total months
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
                        <li onClick={() => navigate("/")} className="nav-item15"><IoMdHome size={35} />Home</li>
                        <li onClick={() => navigate("/child-info")} className="nav-item15"><PiBabyBold size={35} />Child Info</li>
                        <li onClick={() => navigate("/chatbot")} className="nav-item15"><IoChatbubbleEllipsesSharp size={35} />Chat</li>
                        <li onClick={() => navigate("/milestone")} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="nav-item15"><span style={{ fontSize: "1.5em" }}>📊</span>Milestone</li>
                        <li onClick={() => navigate("/signin", { state: { lang: "en" } })} className="nav-item15"
                            style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            <LogOut size={35} />Sign Out
                        </li>
                    </ul>
                </div>

                <div className="main-content-display">
                    <div className="child-assessment-header">
                        <div className="child-info-display">
                            <span><strong>Child Name:</strong> {childInfo?.name || "No child selected"}</span>
                            {/* Display the formatted age here as well */}
                            <span><strong>Age:</strong> {childInfo ? formatAge(childInfo.age) : "N/A"}</span>
                        </div>
                        <button className="add-assessment-btn" onClick={openAssessmentDialog} disabled={!childInfo || !childInfo.id}>
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
                                                <td>{new Date(assessment.assessment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</td>
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
                            <div className="no_past"> <p>No past assessments available for {childInfo?.name || "this child"}.</p></div>
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