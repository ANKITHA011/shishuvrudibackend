import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import './bmiy.css';
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import HeightForAgeChart from "./HeightForAgeChart";
import translations from "./translations7";

const SimpleHeader = ({ parentName, t }) => (
  <div className="simple-header">
    <div className="header-left">
      <img src="/baby-icon.png" alt="Baby Icon" className="baby-icon" />
      <span className="app-title">Shishu Vriddhi</span>
    </div>
    <div className="header-right">
      <div className="signed-in">{t.signedInAs} {parentName || t.loading}</div>
    </div>
  </div>
);

const AssessmentDialog = ({
  childInfo, formatAge, height, setHeight, weight, setWeight,
  handleAssessment, assessmentResult, idealRanges, loading,
  error, setAssessmentResult, onClose, t
}) => (
  <div className="dialog-overlay">
    <div className="dialog-content">
      <div className="dialog-header">
        <img src="/baby-icon.png" alt="Baby Icon" className="dialog-baby-icon" />
        <h3 className="dialog-title">Shishu Vriddhi</h3>
      </div>

      <button className="dialog-close-btn" onClick={onClose}>&times;</button>
      <h2>{t.cgmAssessment}</h2>
      {childInfo ? (
        <>
          <div className="child-info-display">
            <span><strong>{t.childName}:</strong> {childInfo?.name || t.noChildSelected}</span>
            <span><strong>{t.age}:</strong> {formatAge(childInfo.age)}</span>
          </div>

          {!assessmentResult ? (
            <>
              <div className="input-group">
                <label htmlFor="height">{t.height} (cm):</label>
                <input id="height" type="number" value={height}
                  onChange={(e) => setHeight(e.target.value)} placeholder={t.heightPlaceholder} />
              </div>

              <div className="input-group">
                <label htmlFor="weight">{t.weight} (kg):</label>
                <input id="weight" type="number" value={weight}
                  onChange={(e) => setWeight(e.target.value)} placeholder={t.weightPlaceholder} />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button className="submit-btn" onClick={handleAssessment} disabled={loading}>
                {loading ? t.assessing : t.getAssessment}
              </button>
            </>
          ) : (
            <div className="result-box">
              <h3>{t.assessmentResults}</h3>
              <div className="status-results">
                <div className="status-item">
                  <span className="status-label">{t.childHeight}:</span>
                  <span className="status-value">{height} cm</span>
                </div>
                <div className="status-item">
                  <span className="status-label">{t.childWeight}:</span>
                  <span className="status-value">{weight} kg</span>
                </div>
              </div>
              <div className="status-results">
                <div className="status-item">
                  <span className="status-label">{t.heightStatus}:</span>
                  <span className="status-value">
                    {assessmentResult.height_status}
                    {idealRanges && ` (${idealRanges.height_min} - ${idealRanges.height_max} cm)`}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">{t.weightStatus}:</span>
                  <span className="status-value">
                    {assessmentResult.weight_status}
                    {idealRanges && ` (${idealRanges.weight_min} - ${idealRanges.weight_max} kg)`}
                  </span>
                </div>
              </div>
              <div className="recommendation-section">
                <h4>{t.recommendation}:</h4>
                <div className="recommendation-text">
                  {assessmentResult.recommendation}
                </div>
              </div>
              <button className="submit-btn" onClick={() => setAssessmentResult(null)}>
                {t.newAssessment}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="loading-state">
          <p>{t.loadingChildInfo}</p>
        </div>
      )}
    </div>
  </div>
);

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
  const [assessmentsPerPage] = useState(8);
  const [showGraph, setShowGraph] = useState(false);

  const selectedLang = location.state?.lang || "en";
  const t = translations[selectedLang] || translations["en"];

  const parseAgeStringToMonths = (ageString) => {
    if (!ageString) return 0;
    const match = ageString.match(/(\d+)\s*m/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  };

  useEffect(() => {
    const info = location.state?.childInfo || JSON.parse(localStorage.getItem("childInfo"));
    if (info) {
      const ageInMonths = parseAgeStringToMonths(info.age);
      setChildInfo({ ...info, age: ageInMonths });
    } else {
      setError(t.childInfoNotFound);
      setTimeout(() => navigate("/child-info", { state: { lang: selectedLang } }), 2000);
    }

    const storedParentName = localStorage.getItem("parentName");
    if (storedParentName && storedParentName !== parentName) {
      setParentName(storedParentName);
    }
  }, [location.state, navigate, parentName, t.childInfoNotFound, selectedLang]);

  useEffect(() => {
    const fetchPastAssessments = async () => {
      if (childInfo?.id && childInfo?.name) {
        try {
          setPastAssessmentsLoading(true);
          const res = await axios.get("http://localhost:5000/chatbot/child_assessments", {
            params: { id: childInfo.id }
          });
          setPastAssessments(res.data);
        } catch (err) {
          setPastAssessmentsError(t.failedToLoadAssessments);
        } finally {
          setPastAssessmentsLoading(false);
        }
      }
    };
    if (childInfo?.id) fetchPastAssessments();
  }, [childInfo, t.failedToLoadAssessments]);

  const openAssessmentDialog = () => {
    if (!childInfo?.id) {
      setError(t.childInfoIncomplete);
      return;
    }
    setShowDialog(true);
    setHeight('');
    setWeight('');
    setAssessmentResult(null);
    setError('');
    setIdealRanges(null);
  };
  const formatDateDDMMYYYY = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


  const closeAssessmentDialog = () => {
    setShowDialog(false);
    if (assessmentResult) setChildInfo({ ...childInfo });
  };

  const formatAge = (totalMonths) => {
    if (totalMonths == null) return t.notAvailable;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    let result = [];
    if (years) result.push(`${years} ${years > 1 ? t.years : t.year}`);
    if (months) result.push(`${months} ${months > 1 ? t.months : t.month}`);
    return result.join(', ') || t.lessThanOneMonth;
  };

  const handleAssessment = async () => {
    if (!childInfo?.id || height === '' || weight === '') {
      setError(t.fillAllFields);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axios.post("http://localhost:5000/chatbot/child_assessment", {
        id: childInfo.id,
        name: childInfo.name,
        age: childInfo.age,
        gender: childInfo.gender,
        phone: childInfo.phone,
        height: parseFloat(height),
        weight: parseFloat(weight),
        language: selectedLang
      });

      setAssessmentResult(res.data);

      if (res.data.ideal_height_min && res.data.ideal_height_max) {
        setIdealRanges({
          height_min: res.data.ideal_height_min,
          height_max: res.data.ideal_height_max,
          weight_min: res.data.ideal_weight_min,
          weight_max: res.data.ideal_weight_max,
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || t.assessmentFailed);
    } finally {
      setLoading(false);
    }
  };

  const paginate = (num) => setCurrentPage(num);
  const indexOfLast = currentPage * assessmentsPerPage;
  const indexOfFirst = indexOfLast - assessmentsPerPage;
  const currentAssessments = pastAssessments.slice(indexOfFirst, indexOfLast);

  return (
    <div className="bmi-outer-container">
      <SimpleHeader parentName={parentName} t={t} />

      <div className="bmi-content-area">
        <div className="navbar15">
          <ul>
            <li onClick={() => navigate("/", { state: { lang: selectedLang } })} className="nav-item15">
              <IoMdHome size={35} />{t.home}
            </li>
            <li onClick={() => navigate("/child-info", { state: { lang: selectedLang } })} className="nav-item15">
              <PiBabyBold size={35} />{t.childInfo}
            </li>
            <li onClick={() => navigate("/chatbot", { state: { lang: selectedLang } })} className="nav-item15">
              <IoChatbubbleEllipsesSharp size={35} />{t.chat}
            </li>
            <li onClick={() => navigate("/milestone", { state: { lang: selectedLang } })} className="nav-item15">
              <span style={{ fontSize: "1.5em" }}>📊</span>{t.milestone}
            </li>
            <li onClick={() => navigate("/signin", { state: { lang: selectedLang } })} className="nav-item15">
              <LogOut size={35} />{t.signOut}
            </li>
          </ul>
        </div>

        <div className="main-content-display">
          <div className="child-assessment-header">
            <div className="child-info-display">
              <span><strong>{t.childName}:</strong> {childInfo?.name}</span>
              <span><strong>{t.age}:</strong> {childInfo ? formatAge(childInfo.age) : t.notAvailable}</span>
            </div>
            <button className="add-assessment-btn" onClick={openAssessmentDialog}>
              {t.addCGM}
            </button>
                  

          </div>
                                  <button
  className="submit-btn10"
  onClick={() => navigate("/growth-graph", {
    state: {
      assessments: pastAssessments,
      dob: childInfo?.dob,
    }
  })}
>
  {t.showGrowthGraph}
</button>

          {error && <div style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>{error}</div>}

          <div className="previous-assessments">
            {pastAssessmentsLoading ? (
              <p>{t.loadingAssessments}</p>
            ) : pastAssessmentsError ? (
              <p style={{ color: 'red' }}>{pastAssessmentsError}</p>
            ) : pastAssessments.length > 0 ? (
              <>
                <table className="assessments-table">
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.height} (cm)</th>
                      <th>{t.weight} (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAssessments.map((a, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDDMMYYYY(a.assessment_date)}</td>

                        <td>{a.height_cm}</td>
                        <td>{a.weight_kg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>{t.prev}</button>
                  <span>{t.page} {currentPage}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(pastAssessments.length / assessmentsPerPage)))}>{t.next}</button>
                </div>
              </>
            ) : (
              <p>{t.noAssessments} {childInfo?.name}.</p>
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
          t={t}
        />
      )}
    </div>
  );
}

export default BMICheck;