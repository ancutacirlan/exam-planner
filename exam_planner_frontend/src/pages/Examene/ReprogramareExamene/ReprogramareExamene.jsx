import React, { useEffect, useState } from 'react';
import { getExamsForGroup, updateExamDate } from '../../../api/api';
import Calendar from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ReprogramareExamene.css';

const ReprogramareExamene = () => {
  const [exameneRespinse, setExameneRespinse] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    getExamsForGroup(token)
      .then((res) => {
        console.log('Examenele primite:', res);
        const respinse = res.filter(
          (ex) => ex.status?.trim().toUpperCase() === 'RESPINS'
        );
        setExameneRespinse(respinse);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage('Eroare la încărcarea examenele.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Comparatie corecta intre exam_id (poate string sau numar) si selectedExamId (string)
  const selectedExam = exameneRespinse.find(
    (ex) => Number(ex.exam_id) === Number(selectedExamId)
  );

  const rejectedDate = selectedExam ? new Date(selectedExam.exam_date) : null;

  const highlightRejectedDay = (date) => {
    if (
      rejectedDate &&
      date.getFullYear() === rejectedDate.getFullYear() &&
      date.getMonth() === rejectedDate.getMonth() &&
      date.getDate() === rejectedDate.getDate()
    ) {
      return 'rejected-day';
    }
    return undefined;
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !selectedExamId || !selectedDate) {
      setErrorMessage('Selectează un examen și o dată!');
      return;
    }

    console.log('Trimitem PATCH pentru:', {
      examId: Number(selectedExamId),
      date: selectedDate.toISOString().split('T')[0],
    });

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateExamDate(
        Number(selectedExamId),
        { exam_date: selectedDate.toISOString().split('T')[0] },
        token
      );

      setSuccessMessage('Data a fost trimisă cu succes!');
      // Filtrare corecta cu Number
      setExameneRespinse((prev) =>
        prev.filter((ex) => Number(ex.exam_id) !== Number(selectedExamId))
      );
      setSelectedExamId('');
      setSelectedDate(null);
    } catch (err) {
      console.error('Eroare la reprogramare:', err);

      // Dacă err are răspuns de la server, încearcă să afli mesajul exact
      if (err.response && typeof err.response.json === 'function') {
        err.response.json().then((data) => {
          setErrorMessage(
            'Eroare la reprogramare: ' + (data.message || JSON.stringify(data))
          );
        });
      } else {
        setErrorMessage('Eroare la reprogramare. Verifică consola pentru detalii.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reprogramare-container">
      <h2 className="section-title">Reprogramare Examene Respinse</h2>
      {successMessage && <div className="info-card success">{successMessage}</div>}
      {errorMessage && <div className="info-card error">{errorMessage}</div>}

      {loading ? (
        <p>Se încarcă examenele...</p>
      ) : exameneRespinse.length === 0 ? (
        <p>Nu există examene respinse de reprogramat.</p>
      ) : (
        <>
          <label htmlFor="exam-select">Selectează un examen:</label>
          <select
            id="exam-select"
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setSelectedDate(null);
              setSuccessMessage('');
              setErrorMessage('');
            }}
            className="date-picker-input"
          >
            <option value="">-- Selectează --</option>
            {exameneRespinse.map((ex) => (
              <option key={ex.exam_id} value={ex.exam_id}>
                {ex.course_name} ({ex.exam_type})
              </option>
            ))}
          </select>

          {selectedExam && (
            <>
              <p>
                <strong>Profesor:</strong> {selectedExam.professor}
              </p>
              <p>
                <strong>Dată actuală:</strong> {selectedExam.exam_date}
              </p>

              <label>Noua dată:</label>
              <Calendar
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="yyyy-MM-dd"
                className="date-picker-input"
                dayClassName={highlightRejectedDay}
              />

              <br />
              <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Se trimite...' : 'Trimite'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ReprogramareExamene;
