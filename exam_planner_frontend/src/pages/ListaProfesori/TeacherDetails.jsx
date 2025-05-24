import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProfessors, updateUserDetails } from "../../api/api";
import './TeacherDetails.css';

const TeacherDetails = () => {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [editedTeacher, setEditedTeacher] = useState({});
  const [modifiedFields, setModifiedFields] = useState({});
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const loadTeacher = async () => {
      if (!token) {
        setMessage("⚠️ Token lipsă. Autentificare necesară.");
        setMessageType("error");
        return;
      }

      try {
        const data = await fetchProfessors(token);
        const selected = data.find(p => p.user_id === parseInt(user_id));
        if (!selected) {
          setMessage("Profesorul nu a fost găsit.");
          setMessageType("error");
          return;
        }

        setTeacher(selected);
        setEditedTeacher({
          email: selected.email || "",
          name: selected.name || "",
          role: selected.role || "CD",
          user_id: selected.user_id,
        });
      } catch (err) {
        console.error("Eroare la încărcare:", err);
        setMessage("Eroare la încărcarea datelor.");
        setMessageType("error");
      }
    };

    loadTeacher();
  }, [user_id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedTeacher(prev => ({ ...prev, [name]: value }));
    setModifiedFields(prev => ({ ...prev, [name]: true }));
  };

  const handleSave = async () => {
    if (!teacher) return;
  
    const dataToSend = {};
  
    // Asigură-te că trimitem teacherId atunci când rolul este CD
    if (editedTeacher.role === "CD") {
      dataToSend.teacherId = teacher.user_id; // Adaugă teacherId pentru rolul CD
    }
  
    // Adaugă celelalte câmpuri modificate
    ["name", "email", "role"].forEach((key) => {
      if (editedTeacher[key] !== teacher[key]) {
        dataToSend[key] = editedTeacher[key];
      }
    });
  
    // Dacă nu sunt modificări, oprește procesul
    if (Object.keys(dataToSend).length === 0) {
      setMessage("Nu au fost făcute modificări.");
      setMessageType("info");
      return;
    }
  
    try {
      // Trimite cererea de actualizare
      await updateUserDetails(teacher.user_id, dataToSend, token);
      setMessage("Modificările au fost salvate cu succes!");
      setMessageType("success");
    } catch (err) {
      console.error("Eroare la salvare:", err);
      setMessage(`Eroare la salvare: ${err.message || "necunoscută"}`);
      setMessageType("error");
    }
  };
  

  if (!teacher) return <p>Se încarcă datele profesorului...</p>;

  return (
    <div className="teacher-details-container">
      <h2>Editează Profesorul</h2>

      {message && (
        <div className={`status-message ${messageType}`}>
          {message}
        </div>
      )}

      {/* <label>ID profesor:</label>
      <input
        type="text"
        value={teacher.user_id}
        readOnly
        className="input-field"
      /> */}

      <label>Email:</label>
      <input
        type="email"
        name="email"
        value={editedTeacher.email}
        onChange={handleChange}
        className={`input-field ${modifiedFields.email ? "modified" : ""}`}
      />

      <label>Nume:</label>
      <input
        type="text"
        name="name"
        value={editedTeacher.name}
        onChange={handleChange}
        className={`input-field ${modifiedFields.name ? "modified" : ""}`}
      />

      {/* <label>Rol:</label>
      <select
        name="role"
        value={editedTeacher.role}
        onChange={handleChange}
        className={`input-field ${modifiedFields.role ? "modified" : ""}`}
      >
        <option value="CD">Cadru didactic (CD)</option>
        <option value="SEC">Secretariat (SEC)</option>
        <option value="ADM">Administrator (ADM)</option>
        <option value="SG">Șef de grupă (SG)</option>
      </select> */}

      <div className="button-container">
        <button className="back-button" onClick={() => navigate("/users/professors")}>
          Înapoi
        </button>
        <button className="save-button" onClick={handleSave}>
          Salvează
        </button>
      </div>
    </div>
  );
};

export default TeacherDetails;
