import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getExamsForGroup, updateExamDate } from '../../../api/api';
import { useNavigate } from 'react-router-dom';
import './ExameneGrupa.css';

const ExameneGrupa = () => {
  const [examene, setExamene] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [reprogramExamId, setReprogramExamId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [updateMessage, setUpdateMessage] = useState('');

  const userRole = localStorage.getItem('user_role');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    getExamsForGroup(token)
      .then(setExamene)
      .catch(console.error);
  }, [navigate]);

  const translateStatus = (status) => {
    if (!status) return { text: 'Necunoscut', className: '' };
    const s = status.trim().toUpperCase();
    switch (s) {
      case 'ACCEPTAT':
        return { text: 'Acceptat', className: 'status-acceptat' };
      case 'IN_ASTEPTARE':
        return { text: 'În așteptare', className: 'status-in-asteptare' };
      case 'RESPINS':
        return { text: 'Respins', className: 'status-respins' };
      default:
        return { text: s, className: '' };
    }
  };

  const handleReprogramExam = (examId, currentDate) => {
    setReprogramExamId(examId);
    setUpdateMessage('');
    setCalendarDate(currentDate ? new Date(currentDate) : new Date());
    setNewDate(currentDate ? currentDate : '');
  };

  const handleReprogramSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) return;
    const token = localStorage.getItem('access_token');
    try {

      await updateExamDate(reprogramExamId, newDate, token);
      setUpdateMessage('Data a fost actualizată.');
      setReprogramExamId(null);
      setNewDate('');
      const updatedExams = await getExamsForGroup(token);
      setExamene(updatedExams);
    } catch (err) {
      console.error(err);
      setUpdateMessage('Eroare la actualizare.');
    }
  };

  return (
    <div className="examene-grupa-wrapper">
      <div className="examene-header">
        <h2>Examenele Grupei Mele</h2>
        <span className="exam-count">{examene.length} examene</span>
      </div>

      <div className="main-content">
        <div className="examene-table-container">
          <table className="examene-table">
            <thead>
              <tr>
                <th>Curs</th>
                <th>Profesor</th>
                <th>Tip</th>
                <th>Sala</th>
                <th>Clădire</th>
                <th>Durată</th>
                <th>Dată</th>
                <th>Oră</th>
                <th>Asistent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {examene.map((ex) => {
                const { text, className } = translateStatus(ex.status);
                return (
                  <React.Fragment key={ex.exam_id}>
                    <tr
                      onClick={() => setExpandedRow(expandedRow === ex.exam_id ? null : ex.exam_id)}
                    >
                      <td>{ex.course_name}</td>
                      <td>{ex.professor}</td>
                      <td>{ex.exam_type}</td>
                      <td>{ex.room}</td>
                      <td>{ex.building}</td>
                      <td>{ex.duration} min</td>
                      <td>{ex.exam_date}</td>
                      <td>{ex.start_time}</td>
                      <td>{ex.assistant}</td>
                      <td className={`exam-status ${className}`}>
                        {text}
                        {userRole === 'SG' && text === 'Respins' && (
                          <button
                            className="reprogram-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReprogramExam(ex.exam_id, ex.exam_date);
                            }}
                          >
                            Reprogramează
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === ex.exam_id && ex.details && (
                      <tr className="exam-details-row">
                        <td colSpan="10">
                          <strong>Detalii:</strong> {ex.details}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {reprogramExamId && (
            <div className="reprogram-form-container">
              <form onSubmit={handleReprogramSubmit}>
                <label htmlFor="newDate">Noua dată selectată:</label>
                <input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setCalendarDate(new Date(e.target.value));
                  }}
                  required
                />
                <div className="buttons-row">
                  <button type="submit" className="submit-button">
                    Trimite
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setReprogramExamId(null)}
                  >
                    Anulează
                  </button>
                </div>
                {updateMessage && <p className="update-message">{updateMessage}</p>}
              </form>
            </div>
          )}
        </div>

        <div className="calendar-wrapper">
          <Calendar
            value={calendarDate}
            onChange={(date) => {
              setCalendarDate(date);
              setNewDate(date.toISOString().slice(0, 10));
            }}
            tileClassName={({ date }) => {
              const today = new Date();
              if (date.toDateString() === today.toDateString()) return 'calendar-today';

              const matching = examene.find(
                (ex) => new Date(ex.exam_date).toDateString() === date.toDateString()
              );
              if (!matching) return null;

              const status = matching.status?.trim().toUpperCase();
              if (status === 'ACCEPTAT') return 'calendar-acceptat';
              if (status === 'IN_ASTEPTARE') return 'calendar-in-asteptare';
              if (status === 'RESPINS') return 'calendar-respins';

              return null;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExameneGrupa;
