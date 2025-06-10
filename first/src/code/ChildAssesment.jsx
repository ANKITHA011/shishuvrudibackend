import React, { useState } from 'react';

const ChildAssessment = ({ childInfo, setMessages }) => {
    const [showDialog, setShowDialog] = useState(false);
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const handleHeightWeightCheck = async () => {
        if (!height || !weight) return;

        try {
            const res = await fetch("http://localhost:5000/chatbot/child_assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: childInfo.name,
                    age: childInfo.age,
                    gender: childInfo.gender,
                    height: parseFloat(height),
                    weight: parseFloat(weight)
                })
            });

            const data = await res.json();

            if (data.recommendation) {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: "Expert",
                        text: `📏 Assessment:\n• Height is ${data.height_status} the ideal range.\n• Weight is ${data.weight_status} the ideal range.\n\n📝 ${data.recommendation}`,
                        timestamp: new Date().toLocaleString()
                    }
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: "Expert",
                        text: `⚠️ ${data.error || "Unable to generate assessment. Please check the values and try again."}`,
                        timestamp: new Date().toLocaleString()
                    }
                ]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [
                ...prev,
                {
                    sender: "Expert",
                    text: "⚠️ Something went wrong with the height/weight check.",
                    timestamp: new Date().toLocaleString()
                }
            ]);
        } finally {
            setShowDialog(false);
        }
    };

    return (
        <>
            <button onClick={() => setShowDialog(true)}>Check Height & Weight</button>

            {showDialog && (
                <div className="dialog-overlay">
                    <div className="dialog-box">
                        <h3>Enter Child's Details</h3>
                        <label>
                            Height (cm):
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="e.g. 120"
                            />
                        </label>
                        <label>
                            Weight (kg):
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="e.g. 25"
                            />
                        </label>
                        <div className="dialog-actions">
                            <button onClick={handleHeightWeightCheck}>Submit</button>
                            <button onClick={() => setShowDialog(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChildAssessment;
