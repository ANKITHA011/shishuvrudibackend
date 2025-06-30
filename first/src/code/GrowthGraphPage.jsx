import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeightForAgeChart from "./HeightForAgeChart";
import './GrowthGraphPage.css'; // Import your CSS file

function GrowthGraphPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const assessments = location.state?.assessments;
  const dob = location.state?.dob;
  return (
    // Change className to something more descriptive and apply styles from CSS
    <div className="growth-graph-container">
      <button className="back-button" onClick={() => navigate(-1)}>⬅ Back</button>
      <h2>Child Growth Chart</h2>
      {/* Add a wrapper div for the chart to apply specific chart area styles */}
      <div className="chart-wrapper">
        {assessments && assessments.length > 0 ? (
          <HeightForAgeChart assessments={assessments} dob={dob} />
        ) : (
          <p className="no-data-message">No data available to display the growth chart. Please add child assessments.</p>
        )}
      </div>
    </div>
  );
}

export default GrowthGraphPage;