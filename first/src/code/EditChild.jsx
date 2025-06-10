import React, { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import axios from "axios";

function EditChild() {
  const [child, setChild] = useState({ id: null, name: "", age: "", gender: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const storedChild = JSON.parse(localStorage.getItem("childInfo"));
    if (storedChild && storedChild.id) {
      setChild({
        id: storedChild.id,
        name: storedChild.name,
        age: storedChild.age || "",  // Ensure age is string or number
        gender: storedChild.gender || ""
      });
    } else {
      navigate("/child-info");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChild((prevChild) => ({
      ...prevChild,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate age is number
    const ageNum = Number(child.age);
    if (isNaN(ageNum) || ageNum < 0) {
      alert("Please enter a valid age in months.");
      return;
    }

    axios
      .put(`http://localhost:5000/chatbot/children/${child.id}`, {
        name: child.name,
        age: ageNum,
        gender: child.gender,
      })
      .then(() => {
        localStorage.removeItem("childInfo"); // clear stored child after update
        navigate("/child-info");
      })
      .catch(() => {
        alert("Failed to update child information.");
      });
  };

  return (
    <div>
      <h2>Edit Child Information</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            name="name"
            value={child.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Age (months):
          <input
            type="number"
            name="age"
            value={child.age}
            onChange={handleChange}
            required
            min={0}
          />
        </label>
        <label>
          Gender:
          <select
            name="gender"
            value={child.gender}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Gender --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}

export default EditChild;
