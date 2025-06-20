import { useEffect, useState } from "react";
import { reviewExamProposal, fetchProfessors, fetchRooms, getExamsByStatus } from "../../../api/api";
import navigateWithError from "../../../utils/navigateWithError";
import { useNavigate } from "react-router-dom";
import Calendar from 'react-calendar';

import 'react-calendar/dist/Calendar.css';
import "./ExameneInAsteptare.css";

const ExameneInAsteptare = () => {
  const [pendingExams, setPendingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formStates, setFormStates] = useState({});
  const [selectedExam, setSelectedExam] = useState(null);
  const [dateSelected, setDateSelected] = useState(new Date());
  const [successMessage, setSuccessMessage] = useState("");
  const [professors, setProfessors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allExams, setAllExams] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("user_role");

      if (!token) return navigateWithError(navigate, "⚠️ Autentificare necesară.", "Token lipsă");
      if (role !== "CD") return navigateWithError(navigate, "Acces interzis", "Doar coordonatorii pot accesa această pagină.");

      try {
        const examsByStatus = await getExamsByStatus(token);
        setPendingExams(examsByStatus["IN_ASTEPTARE"] || []);

        const allStatuses = Object.entries(examsByStatus).flatMap(([status, exams]) =>
          exams.map(exam => ({ ...exam, status }))
        );
        setAllExams(allStatuses);

        const [profs, roomList] = await Promise.all([
          fetchProfessors(token),
          fetchRooms(token)
        ]);
        setProfessors(profs);
        setRooms(roomList);
      } catch (err) {
        navigateWithError(navigate, err.message, "Eroare la încărcarea propunerilor");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleInputChange = (examId, field, value) => {
    setFormStates(prev => {
      let newValue = value;
      if (field === 'duration') {
        const intValue = parseInt(value);
        newValue = isNaN(intValue) || intValue < 60 ? '60' : intValue.toString();
      }

      return {
        ...prev,
        [examId]: {
          ...prev[examId],
          [field]: newValue,
        }
      };
    });
  };

  const handleSubmit = async (examId) => {
    const token = localStorage.getItem("access_token");
    const form = formStates[examId];

    if (!form?.decision) {
      alert("Selectează o decizie!");
      return;
    }

    const payload = {
      exam_id: examId,
      decision: form.decision,
      details: form.details || ""
    };

    if (form.decision === "ACCEPTAT") {
      if (!form.room_id || !form.assistant_id || !form.start_time || !form.duration) {
        alert("Te rugăm să completezi toate câmpurile pentru decizia ACCEPTAT.");
        return;
      }

      payload.room_id = parseInt(form.room_id);
      payload.assistant_id = parseInt(form.assistant_id);
      payload.start_time = form.start_time;
      payload.duration = parseInt(form.duration);
    }

    try {
      await reviewExamProposal(payload, token);
      setSuccessMessage("Decizia a fost trimisă cu succes!");

      // ✅ Reîncarcă datele
      const updatedExamsByStatus = await getExamsByStatus(token);
      setPendingExams(updatedExamsByStatus["IN_ASTEPTARE"] || []);
      const allStatuses = Object.entries(updatedExamsByStatus).flatMap(([status, exams]) =>
        exams.map(exam => ({ ...exam, status }))
      );
      setAllExams(allStatuses);

      // Reset form & selected
      setFormStates(prev => {
        const newState = { ...prev };
        delete newState[examId];
        return newState;
      });
      setSelectedExam(null);
    } catch (err) {
      alert(`Eroare: ${err.message}`);
    }
  };

  const highlightExamDates = () => pendingExams.map(exam => new Date(exam.exam_date));

  const highlightSelectedExam = (date) => {
    if (selectedExam) {
      const exam = pendingExams.find(exam => exam.exam_id === selectedExam);
      if (exam && new Date(exam.exam_date).toDateString() === date.toDateString()) {
        return 'selected-exam';
      }
    }
    return '';
  };

  const closeSuccessMessage = () => setSuccessMessage("");

  if (loading) return <div>Se încarcă propunerile de examene...</div>;

  return (
    <div className="pending-exams-wrapper">
      <div className="calendar-container-fixed">
        <Calendar
          onChange={setDateSelected}
          value={dateSelected}
          tileClassName={({ date }) => {
            if (!(date instanceof Date)) return '';
            const isExamDate = highlightExamDates().some(d => d.toDateString() === date.toDateString());
            const selectedExamClass = highlightSelectedExam(date);
            return isExamDate ? (selectedExamClass ? selectedExamClass : 'highlight') : '';
          }}
        />
      </div>

      <div className="pending-exams-content">
        <h2>Propuneri de examene în așteptare</h2>

        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
            <button onClick={closeSuccessMessage}>Închide</button>
          </div>
        )}

        <div className="exam-list">
          {pendingExams.length === 0 ? (
            <p>Nu există propuneri în așteptare.</p>
          ) : (
            pendingExams.map((exam) => (
              <div
                key={exam.exam_id}
                onClick={() => setSelectedExam(exam.exam_id)}
                className="exam-item"
              >
                <strong>{exam.course_name}</strong> — propus pentru data: <em>{exam.exam_date}</em>
              </div>
            ))
          )}
        </div>

        {selectedExam && pendingExams.filter(exam => exam.exam_id === selectedExam).map((exam) => {
          const form = formStates[exam.exam_id] || {};
          return (
            <div key={exam.exam_id} className="decision-container">
              <h3>Modifică propunerea pentru <strong>{exam.course_name}</strong></h3>
              <div className="input-row">
                <div>
                  <label>Decizie:</label>
                  <select
                    value={form.decision || ""}
                    onChange={(e) => handleInputChange(exam.exam_id, "decision", e.target.value)}
                  >
                    <option value="">Selectează</option>
                    <option value="ACCEPTAT">Acceptat</option>
                    <option value="RESPINS">Respins</option>
                  </select>
                </div>
              </div>

              {form.decision === "ACCEPTAT" && (
                <>
                  <div className="input-row">
                    <div>
                      <select
                        value={form.room_id || ""}
                        onChange={(e) => handleInputChange(exam.exam_id, "room_id", e.target.value)}
                      >
                        <option value="">Selectează sală</option>
                        {rooms.map((room) => (
                          <option key={room.room_id} value={room.room_id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={form.assistant_id || ""}
                        onChange={(e) => handleInputChange(exam.exam_id, "assistant_id", e.target.value)}
                      >
                        <option value="">Selectează asistent</option>
                        {professors.map((prof) => (
                          <option key={prof.user_id} value={prof.user_id}>
                            {prof.name} ({prof.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="input-row">
                    <div>
                      <label className="small-label">Ora start:</label>
                      <input
                        type="time"
                        value={form.start_time || ""}
                        onChange={(e) => handleInputChange(exam.exam_id, "start_time", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="small-label">Durata (ore) - minim 1</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.duration ? form.duration / 60 : ""}
                        onChange={(e) => {
                          const hours = e.target.value;
                          handleInputChange(exam.exam_id, "duration", hours ? hours * 60 : "");
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <textarea
                  placeholder="Detalii"
                  className="details-textarea"
                  value={form.details || ""}
                  onChange={(e) => handleInputChange(exam.exam_id, "details", e.target.value)}
                />
              </div>

              <div className="button-container">
                <button id="submit-button" onClick={() => handleSubmit(exam.exam_id)}>Trimite decizia</button>
              </div>
            </div>
          );
        })}

        {allExams.length > 0 && (
          <div className="exam-list inactive-section">
            <h3>Toate examenele propuse</h3>
            {allExams.map((exam) => (
              <div key={exam.exam_id} className="exam-item inactive">
                <strong>{exam.course_name}</strong> — {exam.exam_date} — {exam.room} — {exam.start_time?.slice(0, 5)} — <em>Status: {exam.status}</em>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExameneInAsteptare;
