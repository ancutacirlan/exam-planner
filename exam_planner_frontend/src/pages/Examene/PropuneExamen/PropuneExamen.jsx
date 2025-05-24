import React, { useState, useEffect } from 'react';
import { proposeExam, fetchCourses, fetchExaminationPeriods } from '../../../api/api';
import CalendarDisponibilitate from '../../Calendar/CalendarDisponibilitate'; // importă CalendarDisponibilitate
import '../PropuneExamen/PropuneExamen.css';

const PropuneExamen = () => {
  const [courseId, setCourseId] = useState(''); // Cursul selectat
  const [date, setDate] = useState(''); // Data selectată
  const [error, setError] = useState(''); // Mesaj de eroare
  const [success, setSuccess] = useState(''); // Mesaj de succes
  const [courses, setCourses] = useState([]); // Cursuri disponibile
  const [periods, setPeriods] = useState([]); // Perioade de examen disponibile
  const [autoSelectedPeriod, setAutoSelectedPeriod] = useState(null); // Perioada selectată automat
  const [loadingCourses, setLoadingCourses] = useState(true); // Încarcă cursurile
  const [loadingPeriods, setLoadingPeriods] = useState(true); // Încarcă perioadele de examen

  // Fetch cursuri și perioade de examen la montarea componentelor
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Trebuie să fii autentificat pentru a propune un examen.');
      setLoadingCourses(false);
      setLoadingPeriods(false);
      return;
    }

    const getCoursesAndPeriods = async () => {
      try {
        const coursesData = await fetchCourses(token);
        const periodsData = await fetchExaminationPeriods(token);
        setCourses(coursesData);
        setPeriods(periodsData);
      } catch (err) {
        console.error('Eroare la încărcarea datelor:', err);
        setError('Nu am reușit să încarc cursurile și perioadele de examen.');
      } finally {
        setLoadingCourses(false);
        setLoadingPeriods(false);
      }
    };

    getCoursesAndPeriods();
  }, []);

  // Gestionează schimbarea cursului selectat
  const handleCourseChange = (e) => {
    const selectedId = e.target.value;
    setCourseId(selectedId);
    setDate('');
    setAutoSelectedPeriod(null);
  
    const selectedCourse = courses.find(c => c.id === parseInt(selectedId));
    console.log("Selected course:", selectedCourse);
    console.log("Toate perioadele:", periods);
  
    if (
      selectedCourse &&
      typeof selectedCourse.examination_method === 'string' &&
      selectedCourse.examination_method.trim() !== ''
    ) {
      const matchedPeriod = periods.find(p =>
        p.name?.toUpperCase().trim() === selectedCourse.examination_method?.toUpperCase().trim()
      );
      console.log("Matched period:", matchedPeriod);
      setAutoSelectedPeriod(matchedPeriod || null);
    } else {
      setAutoSelectedPeriod(null);
    }
  };

  // Gestionează selecția datei din tabel
  const handlePeriodSelect = (period) => {
    setAutoSelectedPeriod(period);
    setDate(''); // Resetăm data
  };

  // Gestionează selecția datei din calendar
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate.toISOString().split('T')[0]); // Formatează data într-un format "YYYY-MM-DD"
  };

  // const filteredExams = userExams.filter(
  //   (exam) =>
  //     exam.course_id === parseInt(courseId) &&
  //     exam.period_id === autoSelectedPeriod?.examination_period_id
  // );

  // Trimite propunerea de examen
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Trebuie să fii autentificat pentru a propune un examen.');
      return;
    }

    if (!courseId || !date || !autoSelectedPeriod) {
      setError('Toate câmpurile sunt obligatorii.');
      return;
    }

    try {
      const examData = {
        course_id: parseInt(courseId),
        exam_date: date,
        period_id: autoSelectedPeriod.examination_period_id
      };

      // Trimite propunerea la API
      await proposeExam(examData, token);
      setSuccess('Propunerea a fost trimisă cu succes!');
      setCourseId('');
      setDate('');
      setAutoSelectedPeriod(null);
    } catch (err) {
  console.error(err);

  let backendErrorMessage = 'A apărut o eroare neașteptată.';

  if (err.message) {
    try {
      // Caută partea JSON în mesajul erorii
      const jsonStart = err.message.indexOf('{');
      if (jsonStart !== -1) {
        const jsonPart = err.message.substring(jsonStart);
        const parsedError = JSON.parse(jsonPart);
        if (parsedError.error) {
          backendErrorMessage = parsedError.error;
        } else {
          backendErrorMessage = err.message; // fallback dacă nu găsește câmpul 'error'
        }
      } else {
        backendErrorMessage = err.message; // fallback dacă nu găsește JSON în mesaj
      }
    } catch (err) {
      console.error(err);
    
      let backendErrorMessage = 'A apărut o eroare neașteptată.';
    
      if (err.message) {
        try {
          // Caută partea JSON în mesajul erorii
          const jsonStart = err.message.indexOf('{');
          if (jsonStart !== -1) {
            const jsonPart = err.message.substring(jsonStart);
            const parsedError = JSON.parse(jsonPart);
            if (parsedError.error) {
              backendErrorMessage = parsedError.error;
            } else {
              backendErrorMessage = err.message; // fallback dacă nu găsește câmpul 'error'
            }
          } else {
            backendErrorMessage = err.message; // fallback dacă nu găsește JSON în mesaj
          }
        } catch {
          backendErrorMessage = err.message; // fallback dacă JSON invalid
        }
      }
    
      setError(backendErrorMessage);
    }
  }

  setError(backendErrorMessage);
}
  };

  return (
    <div className="propune-examen-container">
      <h2 className="section-title">Propune o dată pentru un Examen/Colocviu</h2>

      <form onSubmit={handleSubmit} className="form-container">
  <div className="form-group">
    <label className="input-label" htmlFor="curs">Curs</label>
    {loadingCourses ? (
      <div className="loader">Se încarcă cursurile...</div>
    ) : (
      <select
        className="input-field"
        id="curs"
        value={courseId}
        onChange={handleCourseChange}
      >
        <option value="">Selectează un curs</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name} ({course.examination_method})
          </option>
        ))}
      </select>
    )}
  </div>

  {/* Calendarul se afișează imediat ce este disponibilă perioada pentru cursul ales */}
  {autoSelectedPeriod && (
    <CalendarDisponibilitate
      examRange={autoSelectedPeriod}
      onDateSelect={handleDateSelect}
      // examDates={filteredExams}
    />
  )}

  <div style={{ display: 'flex', justifyContent: 'center' }}>
    <button type="submit" className="submit-btn" disabled={!autoSelectedPeriod || !date}>
      Trimite Propunerea
    </button>
  </div>
</form>

      {/* Afișează mesaje de eroare sau succes */}
      {error && <p className="submit-error">{error}</p>}
      {success && <div className="info-card success">{success}</div>}
    </div>
  );
};

export default PropuneExamen;
