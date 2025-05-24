import { useLocation, useNavigate, useParams } from "react-router-dom";
import { editExam, fetchProfessors, fetchRooms, getExamDetails } from "../../../api/api";
import navigateWithError from "../../../utils/navigateWithError";
import { useEffect, useState } from "react";
import "./EditareExamene.css";

const EditareExamene = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [form, setForm] = useState({});
  const [professors, setProfessors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedFields, setModifiedFields] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
  
    if (!token) return navigateWithError(navigate, "Autentificare necesară.", "Token lipsă");
    if (role !== "SEC") return navigateWithError(navigate, "Acces interzis", "Doar coordonatorii pot accesa.");
  
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profs, roomList] = await Promise.all([
          fetchProfessors(token),
          fetchRooms(token),
        ]);
  
        setProfessors(profs);
        setRooms(roomList);
  
        // Folosește exam din location.state dacă există
        const examData = location.state?.exam || await getExamDetails(id, token);
        setExam(examData);
  
        const foundRoom = roomList.find(r => r.name === examData.room || r.room_id === examData.room_id);
        const foundProfessor = profs.find(p => p.name === examData.professor || p.user_id === examData.professor_id);
        const foundAssistant = profs.find(p => p.name === examData.assistant || p.user_id === examData.assistant_id);
  
        fillFormFromExam(examData, foundRoom, foundProfessor, foundAssistant);
      } catch (err) {
        navigateWithError(navigate, err.message, "Eroare la încărcarea datelor");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [id, navigate, location.state]); // 🔁 exam a fost scos
  
  

  const fillFormFromExam = (examData, foundRoom, foundProfessor, foundAssistant) => {
    const initialForm = {
      exam_date: examData.exam_date,
      start_time: examData.start_time,
      duration: examData.duration || "",
      room_id: foundRoom?.room_id || "",
      professor_id: foundProfessor?.user_id || "",
      assistant_id: foundAssistant?.user_id || "",
      details: examData.details || ""
    };
    setForm(initialForm);
  };
  

  const handleChange = (field, value) => {
    const numericFields = ["room_id", "assistant_id", "professor_id", "duration"];
    setForm(prev => ({
      ...prev,
      [field]: numericFields.includes(field) ? Number(value) : value
    }));

    setModifiedFields(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("access_token");
    const required = ["room_id", "assistant_id", "start_time", "duration", "exam_date", "professor_id"];
    if (!required.every(f => form[f])) {
      alert("Completează toate câmpurile.");
      return;
    }

    if (Number(form.duration) < 60 || Number(form.duration) > 300) {
      alert("Durata trebuie să fie între 60 și 300 de minute.");
      return;
    }

    const payload = {
      ...form,
      room_id: Number(form.room_id),
      assistant_id: Number(form.assistant_id),
      professor_id: Number(form.professor_id),
      duration: Number(form.duration),
      status: "ACCEPTAT"
    };

    try {
      setSaving(true);
      await editExam(id, payload, token);
      setSuccessMessage("Examenul a fost modificat cu succes!");
      setModifiedFields({});
    } catch (err) {
      alert("Eroare la salvare: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Se încarcă datele examenului...</p>
      </div>
    );
  }

  if (!exam) return <p>Datele examenului nu au fost furnizate.</p>;

  return (
    <div className="editare-examen-container">
      <h2>Editare examen: {exam?.course_name || "Examen necunoscut"}</h2>

      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
          <button onClick={() => setSuccessMessage("")}>X</button>
        </div>
      )}

      <div className="form-grid">
        <div className="input-group">
          <label>Data examenului</label>
          <input
            type="date"
            value={form.exam_date}
            onChange={e => handleChange("exam_date", e.target.value)}
            className={modifiedFields.exam_date ? "input-field modified" : "input-field"}
          />
        </div>

        <div className="input-group">
          <label>Ora de început</label>
          <input
            type="time"
            value={form.start_time}
            onChange={e => handleChange("start_time", e.target.value)}
            className={modifiedFields.start_time ? "input-field modified" : "input-field"}
          />
        </div>

        <div className="input-group">
          <label>Durată (minute)</label>
          <select
            value={form.duration ?? ""}
            onChange={e => handleChange("duration", e.target.value)}
            className={modifiedFields.duration ? "input-field modified" : "input-field"}
          >
            <option value="">Selectează durată</option>
            {[60, 120, 180, 240, 300].map(d => (
              <option key={d} value={d}>{d} minute</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Profesor</label>
          <select
            value={form.professor_id ?? ""}
            onChange={e => handleChange("professor_id", e.target.value)}
          >
            <option value="">Selectează profesor</option>
            {professors.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Asistent</label>
          <select
            value={form.assistant_id ?? ""}
            onChange={e => handleChange("assistant_id", e.target.value)}
          >
            <option value="">Selectează asistent</option>
            {professors.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Sală</label>
          <select
            value={form.room_id ?? ""}
            onChange={e => handleChange("room_id", e.target.value)}
          >
            <option value="">Selectează sală</option>
            {rooms.map(r => (
              <option key={r.room_id} value={r.room_id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group full-width">
          <label>Detalii</label>
          <textarea
            placeholder="Detalii"
            value={form.details}
            onChange={e => handleChange("details", e.target.value)}
          />
        </div>
      </div>

      <div className="button-container-centered">
        <button className="back-button small" onClick={() => navigate("/exam/all")}>Înapoi</button>
        <button
          className="save-button"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Se salvează..." : "Salvează"}
        </button>
      </div>
    </div>
  );
};

export default EditareExamene;
