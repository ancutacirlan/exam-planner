// ExamDetails.jsx
import React, { useState, useEffect } from 'react';
import { getExamDetails } from '../../api/api'; // Importă funcția din api.js

const ExamDetails = ({ examId, token }) => {
  const [examDetails, setExamDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getExamDetails = async () => {
      try {
        const details = await getExamDetails(examId, token);
        setExamDetails(details);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    getExamDetails();
  }, [examId, token]);

  if (loading) return <p>Se încarcă detaliile examenului...</p>;

  if (error) return <p>Eroare: {error}</p>;

  return (
    <div className="exam-details-container">
      <h2>Detalii Examen: {examDetails.course_name}</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>Curs</strong></td>
            <td>{examDetails.course_name}</td>
          </tr>
          <tr>
            <td><strong>Profesor</strong></td>
            <td>{examDetails.professor}</td>
          </tr>
          <tr>
            <td><strong>Asistent</strong></td>
            <td>{examDetails.assistant}</td>
          </tr>
          <tr>
            <td><strong>Sala</strong></td>
            <td>{examDetails.room}</td>
          </tr>
          <tr>
            <td><strong>Clădire</strong></td>
            <td>{examDetails.building}</td>
          </tr>
          <tr>
            <td><strong>Detalii</strong></td>
            <td>{examDetails.details}</td>
          </tr>
          <tr>
            <td><strong>Durată</strong></td>
            <td>{examDetails.duration} minute</td>
          </tr>
          <tr>
            <td><strong>Data</strong></td>
            <td>{examDetails.exam_date}</td>
          </tr>
          <tr>
            <td><strong>Ora</strong></td>
            <td>{examDetails.start_time}</td>
          </tr>
          <tr>
            <td><strong>Tip</strong></td>
            <td>{examDetails.exam_type}</td>
          </tr>
          <tr>
            <td><strong>Status</strong></td>
            <td>{examDetails.status}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ExamDetails;
