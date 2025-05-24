// pages/EditPeriod.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExaminationPeriodById, updateExaminationPeriod } from "../../api/api";
import PeriodForm from "../../components/PeriodForm";
import "../Setari/Setari.css";

const EditPeriod = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [formData, setFormData] = useState({
    id: "",
    name: "EXAMEN",
    period_start: "",
    period_end: ""
  });

  useEffect(() => {
    getExaminationPeriodById(id, token)
      .then((data) =>
        setFormData({
          id: data.examination_period_id,
          name: data.name,
          period_start: data.period_start,
          period_end: data.period_end
        })
      )
      .catch((err) => {
        alert("Eroare la încărcare: " + err.message);
        navigate("/setari");
      });
  }, [id, token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateExaminationPeriod(id, formData, token)
      .then(() => navigate("/setari"))
      .catch((err) => alert(err.message));
  };

  return (
    <div className="settings-container">
      <h2 className="section-title">Editare Perioadă</h2>
      <div className="form-container">
        <PeriodForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isEdit={true}
        />
      </div>
    </div>
  );
};

export default EditPeriod;
