import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UpdateExamForm.css';
import UpdateExamForm from "./UpdateExamForm";

const UpdateExamForm = ({ examId, token }) => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`/api/exam/${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExam(res.data);
        setLoading(false);
      } catch (err) {
        setError('Eroare la încărcarea examenului.');
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, token]);

  const handleChange = (e) => {
    setExam({ ...exam, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await axios.put(`/api/exam/${examId}/update-datee`, {
        exam_date: exam.exam_date,
        start_time: exam.start_time,
        duration: parseInt(exam.duration),
        room_id: parseInt(exam.room_id),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Examenul a fost actualizat cu succes.');
    } catch (err) {
      setError('Eroare la actualizarea examenului.');
    }
  };  

  if (loading) return <p>Se încarcă datele...</p>;
  if (!exam) return <p>Nu s-au găsit detalii.</p>;

  return (
    <div className="update-exam-form">
      <h2>Actualizează Examen</h2>
      <form onSubmit={handleSubmit}>
        <label>Dată:</label>
        <input type="date" name="exam_date" value={exam.exam_date} onChange={handleChange} required />

        <label>Ora începerii:</label>
        <input type="time" name="start_time" value={exam.start_time} onChange={handleChange} required />

        <label>Durată (minute):</label>
        <input type="number" name="duration" value={exam.duration} onChange={handleChange} required />

        <label>ID Sală:</label>
        <input type="number" name="room_id" value={exam.room_id} onChange={handleChange} required />

        <button type="submit">Salvează</button>
      </form>
      {success && <p className="success-msg">{success}</p>}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
};

export default UpdateExamForm;
