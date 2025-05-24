import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, setExaminationMethod } from "../../api/api";
import navigateWithError from "../../utils/navigateWithError";
import "./Courses.css";

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [savingCourseId, setSavingCourseId] = useState(null);

  const [filterYear, setFilterYear] = useState("Toate");
  const [filterExamination, setFilterExamination] = useState("Toate");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigateWithError(navigate, "⚠️ Autentificare necesară.", "Token lipsă");
      return;
    }

    const role = localStorage.getItem("user_role"); // presupunem că e deja salvat
    setUserRole(role);

    fetchCourses(token)
      .then((data) => {
        setCourses(data);
        setFilteredCourses(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        navigateWithError(navigate, err.message, "Eroare la încărcarea cursurilor");
      });
  }, []);

  useEffect(() => {
    let filtered = courses;

    if (filterYear !== "Toate") {
      filtered = filtered.filter(c => String(c.study_year) === filterYear);
    }

    if (filterExamination !== "Toate") {
      filtered = filtered.filter(c => c.examination_method === filterExamination);
    }

    setFilteredCourses(filtered);
  }, [courses, filterYear, filterExamination]);

  // Handlere pentru schimbarea filtrelor
  const handleFilterYearChange = (e) => {
    setFilterYear(e.target.value);
  };

  const handleFilterExaminationChange = (e) => {
    setFilterExamination(e.target.value);
  };


  const handleViewDetails = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  const handleExaminationChange = async (courseId, newMethod) => {
    try {
      const token = localStorage.getItem("access_token");
      setSavingCourseId(courseId);
      await setExaminationMethod(courseId, newMethod, token);
      setFilteredCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, examination_method: newMethod } : c
        )
      );
    } catch (err) {
      navigateWithError(navigate, err.message, "Eroare la salvarea metodei");
    } finally {
      setSavingCourseId(null);
    }
  };

  return (
    <div className="home-container">
      {isLoading ? (
        <p>Se încarcă cursurile...</p>
      ) : (
        <>
          <div className="courses-header">
            <h2>Cursuri disponibile</h2>
            <span className="course-count">{filteredCourses.length} cursuri</span>
          </div>

          {/* Filtre statice, doar UI */}
          {userRole === "SEC" && (
            <div className="filters-container">
              <div>
                <label htmlFor="filter-year">An studiu</label>
                <select id="filter-year" value={filterYear} onChange={handleFilterYearChange}>
               
                  <option>Toate</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-examination">Examinare</label>
                <select
                id="filter-examination"
                value={filterExamination}
                onChange={handleFilterExaminationChange}
              >
                  <option>Toate</option>
                  <option>EXAMEN</option>
                  <option>COLOCVIU</option>
                </select>
              </div>
            </div>
          
          )}
          <div className="table-container">
            <table className="courses-table">
              <thead>
                <tr>
                  {/* <th>ID</th> */}
                  <th>Nume</th>
                  <th>An studiu</th>
                  <th>Specializare</th>
                  <th>Examinare</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr
                    key={course.id}
                    onClick={() => handleViewDetails(course.id)}
                    className="clickable-row"
                  >
                    {/* <td>{course.id}</td> */}
                    <td>{course.name}</td>
                    <td>{course.study_year}</td>
                    <td>{course.specialization}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {userRole === "CD" || userRole === "SEC" ? (
                        savingCourseId === course.id ? (
                          <span className="saving-text">Se salvează...</span>
                        ) : (

                          <select
                              value={course.examination_method || ""}
                              onChange={(e) => handleExaminationChange(course.id, e.target.value)}
                            >
                              {(!course.examination_method || course.examination_method === "") && (
                                <option value="" disabled>
                                    
                                </option>
                              )}
                              <option value="EXAMEN">EXAMEN</option>
                              <option value="COLOCVIU">COLOCVIU</option>
                            </select>

                        )
                      ) : (
                        course.examination_method
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Courses;
