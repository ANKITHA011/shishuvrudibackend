import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);

const HeightForAgeChart = ({ assessments }) => {
  if (!assessments || assessments.length === 0) return null;

  // Sort by assessment date ascending
  const sorted = [...assessments].sort(
    (a, b) => new Date(a.assessment_date) - new Date(b.assessment_date)
  );

  const startDate = new Date(sorted[0].assessment_date);

  // Helper function to calculate month difference
  const getMonthDifference = (start, end) => {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  };

  const labels = sorted.map((a) => {
    const currentDate = new Date(a.assessment_date);
    const monthsDiff = getMonthDifference(startDate, currentDate);

    // 🐞 Debug print
    console.log(`Assessment date: ${a.assessment_date}, Months diff: ${monthsDiff}`);

    return `${monthsDiff}m`;
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Height (cm)",
        data: sorted.map((a) => a.height_cm),
        fill: false,
        borderColor: "#4A90E2",
        tension: 0.3,
        pointBackgroundColor: "#1E88E5",
        pointBorderColor: "#fff",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: { size: 14, family: 'Segoe UI' },
          color: '#555',
        },
      },
      title: {
        display: true,
        text: "Child's Height vs Age (Months)",
        font: { size: 20, family: 'Segoe UI', weight: 'bold' },
        color: '#333',
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 16, family: 'Segoe UI' },
        bodyFont: { size: 14, family: 'Segoe UI' },
        padding: 12,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Age (Months)',
          font: { size: 16, family: 'Segoe UI', weight: '600' },
          color: '#444',
        },
        ticks: {
          font: { size: 12, family: 'Segoe UI' },
          color: '#666',
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Height (cm)',
          font: { size: 16, family: 'Segoe UI', weight: '600' },
          color: '#444',
        },
        ticks: {
          font: { size: 12, family: 'Segoe UI' },
          color: '#666',
        },
        grid: {
          color: '#e0e0e0',
          borderDash: [5, 5],
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
  };

  return <Line data={data} options={options} />;
};

export default HeightForAgeChart;
