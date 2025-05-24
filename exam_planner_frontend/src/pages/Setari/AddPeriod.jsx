// pages/AddPeriod.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addExaminationPeriod } from "../../api/api";
import PeriodForm from "../../components/PeriodForm";
import "../Setari/Setari.css";

const AddPeriod = () => {
  const [formData, setFormData] = useState({
    name: "EXAMEN",
    period_start: "",
    period_end: ""
  });
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const handleSubmit = (e) => {
    e.preventDefault();
    addExaminationPeriod(formData, token)
      .then(() => navigate("/setari"))
      .catch((err) => alert(err.message));
  };

  return (
    <div className="settings-container">
      <h2 className="section-title">Adaugă Perioadă de Examinare</h2>
      <div className="form-container">
        <PeriodForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isEdit={false}
        />
      </div>
    </div>
  );
};

export default AddPeriod;
