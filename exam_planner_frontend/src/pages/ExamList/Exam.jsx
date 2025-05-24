import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchExams } from "../../api/api";
import '../Examene/ExameneGrupa/ExameneGrupa.css'; // Refolosim stilul existent
import './Exam.css'

const Exam = () => {
  const [examsData, setExamsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const loadExams = async () => {
      try {
        const data = await fetchExams(token);
        setExamsData(data);
      } catch (err) {
        console.error("Eroare la preluarea examenelor:", err);
        setError("Nu s-au putut încărca examenele.");
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, [token]);

  const filterOptions = {
    ALL: "Toate",
    IN_ASTEPTARE: "În așteptare",
    ACCEPTAT: "Acceptate",
    RESPINS: "Respinse",
    MISSING: "Neprogramate"
  };

  const getFilteredExams = () => {
    if (!examsData) return [];

    if (filter === "MISSING") {
      return examsData.missing_exams.flatMap(item =>
        item.missing_exams.map(ex => ({
          course_name: ex.course_name,
          professor: ex.coordinator,
          group_name: item.group,
          status: "NEPROGRAMAT",
          exam_date: "-",
          start_time: "-",
          duration: "-",
          room: "-",
          building: "-",
          assistant: "-",
          details: "",
        }))
      );
    }

    const all = Object.entries(examsData.exams_by_status).flatMap(([status, exams]) =>
      exams.map(exam => ({ ...exam, status }))
    );

    return filter === "ALL" ? all : all.filter(ex => ex.status === filter);
  };

  const translateStatus = (status) => {
    const normalized = status?.trim().toUpperCase().replace(/\s+/g, "_");
    switch (normalized) {
      case 'IN_ASTEPTARE':
        return { text: 'În așteptare', className: 'in_asteptare' };
      case 'ACCEPTAT':
        return { text: 'Acceptat', className: 'acceptat' };
      case 'RESPINS':
        return { text: 'Respins', className: 'respins' };
      case 'NEPROGRAMAT':
        return { text: 'Neprogramat', className: 'necunoscut' };
      default:
        return { text: 'Necunoscut', className: 'necunoscut' };
    }
  };

  if (loading) return <p>Se încarcă...</p>;

  const filteredExams = getFilteredExams();

  return (
    <div className="examene-grupa-wrapper">
      <div className="examene-header">
        <h2>Lista examenelor</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="custom-dropdown">
          {Object.entries(filterOptions).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
          <button className="back-button" onClick={() => navigate("/home")}>
            Înapoi
          </button>
        </div>
      </div>

      {error && <div className="message-box error">{error}</div>}

      {filteredExams.length === 0 ? (
        <p>Nu există examene pentru filtrul selectat.</p>
      ) : (
        <div className="examene-table-container">
          <table className="examene-table">
            <thead>
              <tr>
                <th>Curs</th>
                <th>Profesor</th>
                <th>Grupă</th>
                <th>Dată</th>
                <th>Oră</th>
                <th>Durată</th>
                <th>Sala</th>
                <th>Asistent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredExams.map((exam, index) => {
                const { text, className } = translateStatus(exam.status);
                
                return (
                  <tr
                    key={index}
                    className="examene-row"
                    onClick={() => {
                      const normalizedExam = {
                        ...exam,
                        professor: (exam.professor && typeof exam.professor === 'object') ? exam.professor.name : (exam.professor || "-"),
                        assistant: (exam.assistant && typeof exam.assistant === 'object') ? exam.assistant.name : (exam.assistant || "-"),
                        room: (exam.room && typeof exam.room === 'object') ? exam.room.name : (exam.room || "-"),
                        building: (exam.building && typeof exam.building === 'object') ? exam.building.name : (exam.building || "-"),
                      };
                    
                      console.log("Trimitem la editare:", normalizedExam);
                    
                      if (exam.exam_id) {
                        navigate(`/exam/edit/${exam.exam_id}`, { state: { exam: normalizedExam } });
                      } else {
                        console.warn("Exam fără ID:", exam);
                      }
                    }}
                    style={{ cursor: exam.id ? 'pointer' : 'default' }}
                  >

                    <td>{exam.course_name}</td>
                    <td>{exam.professor}</td>
                    <td>{exam.group_name}</td>
                    <td>{exam.exam_date}</td>
                    <td>{exam.start_time}</td>
                    <td>{exam.duration ? `${exam.duration} min` : "-"}</td>
                    <td>{exam.room} ({exam.building})</td>
                    <td>{exam.assistant}</td>
                    <td className={`exam-status ${className}`}>{text}</td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
};

export default Exam;
