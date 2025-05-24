import { useEffect, useState } from "react";
import { reviewExamProposal,fetchProfessors, fetchRooms,getExamsByStatus } from "../../../api/api";  // Nu mai importăm getAcceptedExams
import navigateWithError from "../../../utils/navigateWithError";
import { useNavigate } from "react-router-dom";
import Calendar from 'react-calendar'; // Importăm Calendar

import 'react-calendar/dist/Calendar.css'; // Importăm stilurile pentru calendar
import "./ExameneInAsteptare.css";

const ExameneInAsteptare = () => {
  const [pendingExams, setPendingExams] = useState([]);  // Numai examenele în așteptare
  const [loading, setLoading] = useState(true);
  const [formStates, setFormStates] = useState({});
  const [selectedExam, setSelectedExam] = useState(null);  // Examenul selectat
  const [dateSelected, setDateSelected] = useState(new Date()); // Data selectată pe calendar
  const [successMessage, setSuccessMessage] = useState("");  // Mesajul de succes
  const [professors, setProfessors] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
        const fetchData = async () => {
          const token = localStorage.getItem("access_token");
          const role = localStorage.getItem("user_role");
      
          if (!token) {
            navigateWithError(navigate, "⚠️ Autentificare necesară.", "Token lipsă");
            return;
          }
      
          if (role !== "CD") {
            navigateWithError(navigate, "Acces interzis", "Doar coordonatorii pot accesa această pagină.");
            return;
          }
      
          try {
            const examsByStatus = await getExamsByStatus(token); // ✅ nou
      
            // Extragem doar examenele în așteptare pentru UI
            setPendingExams(examsByStatus["IN_ASTEPTARE"] || []);
      
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
  
      // Dacă modificăm durata, verificăm să fie minim 60 minute
      if (field === 'duration') {
        const intValue = parseInt(value);
        if (isNaN(intValue) || intValue < 60) {
          newValue = '60'; // setăm minim 60 minute
        } else {
          newValue = intValue.toString();
        }
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
      setSuccessMessage("Decizia a fost trimisă cu succes!");  // Setăm mesajul de succes
      setPendingExams(prev => prev.filter(exam => exam.exam_id !== examId));  // Eliminăm examenul din lista de pending
      setFormStates(prev => {
        const newState = { ...prev };
        delete newState[examId];
        return newState;
      });
      setSelectedExam(null);  // Resetăm examenul selectat
    } catch (err) {
      alert(`Eroare: ${err.message}`);
    }
  };

  // Funcția de evidențiere a examenelor pe calendar
  const highlightExamDates = () => {
    return pendingExams.map(exam => new Date(exam.exam_date));  // Evidențiem doar examenele în așteptare
  };

  // Functia pentru evidențierea examenului selectat
  const highlightSelectedExam = (date) => {
    if (selectedExam) {
      const exam = pendingExams.find(exam => exam.exam_id === selectedExam);
      if (exam && new Date(exam.exam_date).toDateString() === date.toDateString()) {
        return 'selected-exam';  // Clasa CSS pentru stilul examenului selectat
      }
    }
    return '';
  };

  const getRoomNameById = (id) => {
    const room = rooms.find(r => r.room_id === parseInt(id));
    return room ? room.room_name : "Necunoscut";
  };

  const closeSuccessMessage = () => {
    setSuccessMessage("");  // Închidem mesajul de succes
  };

  if (loading) return <div>Se încarcă propunerile de examene...</div>;

  
  return (
    <div className="pending-exams-wrapper">
      {/* Calendar în stânga */}
      <div className="calendar-container-fixed">
        <Calendar
          onChange={setDateSelected}
          value={dateSelected}
          tileClassName={({ date, view }) => {
            if (!(date instanceof Date)) return '';
            const isExamDate = highlightExamDates().some(examDate =>
              examDate.toDateString() === date.toDateString()
            );
            const selectedExamClass = highlightSelectedExam(date);
            return isExamDate ? (selectedExamClass ? selectedExamClass : 'highlight') : '';
          }}
        />
      </div>
  
      {/* Conținutul principal în dreapta */}
      <div className="pending-exams-content">
        <h2>Propuneri de examene în așteptare</h2>
  
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
            <button onClick={closeSuccessMessage}>Închide</button>
          </div>
        )}
  
        {selectedExam && (
          <div className="decision-container">
            {pendingExams.filter(exam => exam.exam_id === selectedExam).map((exam) => {
              const form = formStates[exam.exam_id] || {};
  
              return (
                <div key={exam.exam_id}>
                  <h3>Modifică propunerea pentru examenul <strong>{exam.course_name}</strong></h3>
  
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
                                {room.room_name}
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
      </div>
    </div>
  );
  
};

export default ExameneInAsteptare;
