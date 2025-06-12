import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import './bmiy.css'; // Assuming this CSS file exists for general styling
import { LogOut } from "lucide-react"; // Using Lucide-React for the LogOut icon

// CurveHeader component (no changes needed here, assuming childInfo prop is passed)
const CurveHeader = ({ childInfo, parentName }) => (
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
                <span className="curve-text5">CHAT WITH ME</span>
            </div>
            <div className="curve-right-section">
                {/* It's good practice to ensure childInfo is not null before trying to display.
                    Also, ensure parentName is passed from the parent component. */}
                {/* You might want to consider if childInfo is truly needed in the header here,
                    or if the parent name is sufficient for the "Signed in as" message. */}
                <div className="curve-right-section">
                    <div className="child-info-line">Sign in as {parentName || "Loading..."}</div>
                </div>
            </div>
        </div>
    </div>
);

// ---

function BMICheck() {
    const navigate = useNavigate();
    const location = useLocation();
    const [childInfo, setChildInfo] = useState(null);
    // Initialize parentName from localStorage, with 'Loading...' as fallback
    const [parentName, setParentName] = useState(localStorage.getItem("parentName") || "Loading...");
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [assessmentResult, setAssessmentResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Retrieve child information from location state or localStorage
        const info = location.state?.childInfo || JSON.parse(localStorage.getItem("childInfo"));
        if (info) {
            setChildInfo(info);
        } else {
            setError("Child information not found. Please select a child first.");
            // Redirect to child-info page after a delay
            setTimeout(() => navigate("/child-info"), 2000);
        }

        // --- Important for parentName display ---
        // This useEffect runs on component mount. It will update parentName state
        // if localStorage.getItem("parentName") changes or is set after initial render.
        const storedParentName = localStorage.getItem("parentName");
        if (storedParentName && storedParentName !== parentName) {
            setParentName(storedParentName);
        }
        // --- End important for parentName display ---

    }, [location.state, navigate, parentName]); // Added parentName to dependencies to re-run if it changes

    // Function to format age from total months to "X years, Y months"
    const formatAge = (totalMonths) => {
        if (totalMonths === null || totalMonths === undefined) {
            return "N/A";
        }
        totalMonths = Number(totalMonths);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        let ageParts = [];
        if (years > 0) {
            ageParts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
        }
        if (months > 0) {
            ageParts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
        }

        if (ageParts.length === 0 && totalMonths === 0) {
            return "Less than 1 month";
        } else if (ageParts.length === 0 && totalMonths > 0) {
            return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
        }
        return ageParts.join(', ');
    };

    const handleAssessment = async () => {
        if (!childInfo) {
            setError("Child information is missing.");
            return;
        }
        if (!height.trim() || !weight.trim()) {
            setError("Please enter both height and weight.");
            return;
        }

        setLoading(true);
        setError('');
        setAssessmentResult(null);

        try {
            const res = await axios.post("http://localhost:5000/chatbot/child_assessment", {
                name: childInfo.name,
                age: childInfo.age,
                phone: childInfo.phone,
                gender: childInfo.gender,
                height: parseFloat(height),
                weight: parseFloat(weight)
            });
            setAssessmentResult(res.data);
        } catch (err) {
            console.error("Assessment error:", err);
            if (err.response && err.response.data && err.response.data.error) {
                setError(`Assessment failed: ${err.response.data.error}`);
            } else {
                setError("Failed to get assessment. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex font-inter">
            {/* Sidebar */}
            <div className="sliderbar2">
                <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200" onClick={() => navigate("/")}>
                        <span className="text-2xl">🏠</span>Home
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200" onClick={() => navigate("/child-info")}>
                        <span className="text-2xl">👶</span>Child Info
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200" onClick={() => navigate("/milestone", { state: { childInfo: childInfo } })}>
                        <span className="text-2xl">📊</span>Milestone
                    </li>
                    <li className="flex items-center gap-3 bg-indigo-100 text-indigo-700 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200 active-nav-item">
                        <span className="text-2xl">📏</span>BMI Check
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200" onClick={() => navigate("/chatbot", { state: { childInfo: childInfo } })}>
                        <span className="text-2xl">💬</span>Chat
                    </li>
                </ul>
                <div className="mt-8">
                    <li className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer text-lg font-medium p-2 rounded-md transition-colors duration-200" onClick={() => navigate("/signin", { state: { lang: 'en' } })}>
                        <LogOut size={24} />Sign Out
                    </li>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center p-8">
                {/* Pass childInfo prop to CurveHeader if it's needed there */}
                <CurveHeader childInfo={childInfo} parentName={parentName} title="CHILD BMI CHECK" />

                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl mt-8">
                    <div className="text-center mb-6">
                        {childInfo ? (
                            <>
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">BMI Assessment for {childInfo.name}</h2>
                                <p className="text-lg text-gray-600 mb-4">Age: {formatAge(childInfo.age)}</p>
                                <p className="text-md text-gray-700">Enter your child's current height and weight to get an assessment.</p>
                            </>
                        ) : (
                            <div className="text-center text-lg text-gray-500">
                                <p>Loading child information...</p>
                            </div>
                        )}
                    </div>

                    {childInfo && (
                        <div className="space-y-6">
                            <div className="flex flex-col">
                                <label htmlFor="height" className="text-gray-700 font-semibold mb-2">Height (cm):</label>
                                <input
                                    id="height"
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    placeholder="e.g., 75.5"
                                    step="0.1"
                                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="weight" className="text-gray-700 font-semibold mb-2">Weight (kg):</label>
                                <input
                                    id="weight"
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="e.g., 9.2"
                                    step="0.1"
                                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">{error}</div>}

                            <button
                                onClick={handleAssessment}
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {loading ? 'Assessing...' : 'Get Assessment'}
                            </button>

                            {assessmentResult && (
                                <div className="assessment-result mt-8 p-6 bg-indigo-50 rounded-lg shadow-inner">
                                    <h3 className="text-2xl font-bold text-indigo-800 mb-4">Assessment Results:</h3>
                                    <p className="mb-2 text-gray-700"><strong>Height Status:</strong> <span className="font-semibold text-indigo-700">{assessmentResult.height_status}</span></p>
                                    <p className="mb-4 text-gray-700"><strong>Weight Status:</strong> <span className="font-semibold text-indigo-700">{assessmentResult.weight_status}</span></p>
                                    <div className="recommendation border-t pt-4 border-indigo-200">
                                        <h4 className="text-xl font-bold text-indigo-800 mb-2">Recommendation:</h4>
                                        <p className="text-gray-800 leading-relaxed">{assessmentResult.recommendation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Tailwind CSS CDN script - ensure this is loaded in your main index.html or similar entry point */}
            {/* Note: In a production React app, you'd typically use PostCSS and Tailwind CLI/plugin, not a CDN script in individual components. */}
            <script src="https://cdn.tailwindcss.com"></script>
        </div>
    );
}

export default BMICheck;