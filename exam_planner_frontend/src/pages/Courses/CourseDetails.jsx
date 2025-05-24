import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCourseDetails, updateCourseDetails } from "../../api/api";
import './CourseDetails.css';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [editedCourse, setEditedCourse] = useState(null);
  const [modifiedFields, setModifiedFields] = useState({}); // urmărim câmpurile modificate
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem("user_role")); // Exemplu: setăm rolul din localStorage

  const token = localStorage.getItem("access_token") || localStorage.getItem("token");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const courseData = await fetchCourseDetails(id, token);
        setCourse(courseData);
        setEditedCourse(courseData);
      } catch (error) {
        setError('Eroare la încărcarea detaliilor cursului');
      }
    };

    fetchDetails();
  }, [id, token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCourse((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Marchează câmpul ca modificat
    setModifiedFields((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleAssistantsChange = (index, value) => {
    const newAssistants = [...editedCourse.assistants];
    newAssistants[index] = value;
    setEditedCourse((prev) => ({
      ...prev,
      assistants: newAssistants,
    }));

    // Marchează câmpul asistent ca modificat
    setModifiedFields((prev) => ({
      ...prev,
      assistants: true,
    }));
  };

  const handleAddAssistant = () => {
    setEditedCourse((prev) => ({
      ...prev,
      assistants: [...prev.assistants, ""],
    }));

    // Marchează câmpul ca modificat
    setModifiedFields((prev) => ({
      ...prev,
      assistants: true,
    }));
  };

  const handleRemoveAssistant = (index) => {
    const newAssistants = editedCourse.assistants.filter((_, i) => i !== index);
    setEditedCourse((prev) => ({
      ...prev,
      assistants: newAssistants,
    }));

    // Marchează câmpul ca modificat
    setModifiedFields((prev) => ({
      ...prev,
      assistants: true,
    }));
  };

  const handleSave = async () => {
    try {
      await updateCourseDetails(course.course_id, editedCourse, token);
      setCourse(editedCourse);

      const confirmReturn = window.confirm("Modificările au fost salvate cu succes! Apasă OK pentru a reveni la lista de cursuri.");
      if (confirmReturn) {
        navigate("/courses");
      }
    } catch (err) {
      alert("Eroare la salvarea modificărilor.");
    }
  };

  const handleBack = () => {
    navigate("/courses");
  };

  if (error) return <p>{error}</p>;
  if (!course) return <p>Se încarcă detaliile cursului...</p>;

  return (
    <div className="course-details-container">
      <h2 className="course-details-title">Detalii curs: {course.name}</h2>

      {/* Modificările sunt permise doar pentru SECRETARIAT (SEC) */}
      {userRole === "SEC" && (
        <div>
          <label className="input-label"><strong>Denumire:</strong></label>
          <input
            type="text"
            name="name"
            value={editedCourse.name}
            onChange={handleInputChange}
            className={`input-field ${modifiedFields.name ? "modified" : ""}`}  // adăugăm clasa 'modified'
          />
        </div>
      )}

      {/* Afișează informațiile pentru toți utilizatorii (profesori și secretariat) */}
      <div>
        <label className="input-label"><strong>Coordonator:</strong></label>
        <input
          type="text"
          name="coordinator"
          value={editedCourse.coordinator}
          onChange={handleInputChange}
          className={`input-field ${modifiedFields.coordinator ? "modified" : ""}`}  // adăugăm clasa 'modified'
          disabled={userRole !== "SEC"} // Permite editarea doar pentru SECRETARIAT
        />
      </div>

      <div>
        <label className="input-label"><strong>Specializare:</strong></label>
        <input
          type="text"
          name="specialization"
          value={editedCourse.specialization}
          onChange={handleInputChange}
          className={`input-field ${modifiedFields.specialization ? "modified" : ""}`}  // adăugăm clasa 'modified'
          disabled={userRole !== "SEC"} // Permite editarea doar pentru SECRETARIAT
        />
      </div>

      <div>
        <label className="input-label"><strong>An de studiu:</strong></label>
        <select
          name="study_year"
          value={editedCourse.study_year}
          onChange={handleInputChange}
          className={`input-field ${modifiedFields.study_year ? "modified" : ""}`}  // adăugăm clasa 'modified'
          disabled={userRole !== "SEC"} // Permite editarea doar pentru SECRETARIAT
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>

      <div>
        <label className="input-label"><strong>Asistenți:</strong></label>
        {editedCourse.assistants.map((assistant, index) => (
          <div key={index} className="assistant-item">
            <input
              type="text"
              value={assistant}
              onChange={(e) => handleAssistantsChange(index, e.target.value)}
              className={`input-field ${modifiedFields.assistants ? "modified" : ""}`}  // adăugăm clasa 'modified'
              disabled={userRole !== "SEC"}  // Permite editarea doar pentru SECRETARIAT
            />
            {userRole === "SEC" && (
              <button onClick={() => handleRemoveAssistant(index)} className="remove-button">Șterge</button>
            )}
          </div>
        ))}
        {userRole === "SEC" && (
          <button onClick={handleAddAssistant} className="add-button">Adaugă asistent</button>
        )}
      </div>

      <div className="button-container">
        <button onClick={handleBack} className="back-button">Înapoi</button>
        {userRole === "SEC" && (
          <button onClick={handleSave} className="save-button">Salvează</button>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
