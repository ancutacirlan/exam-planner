import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, logout, getExamsForGroup } from "../../api/api";  // Folosim logout din API

import Setari from "../Setari/Setari";
import Courses from "../Courses/Courses";
import ExamDetails from '../Examene/ExamDetails';
import navigateWithError from "../../utils/navigateWithError";
import './Home.css';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]); // dacă filtrezi cursuri
  const [examsForGroup, setExamsForGroup] = useState([]);     // dacă afișezi examenele pentru SG
  const [activeTab, setActiveTab] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [examDetails, setExamDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Funcție pentru a verifica dacă token-ul este expirat
  const checkTokenExpiration = (token) => {
    const decoded = JSON.parse(atob(token.split('.')[1])); // decodifică JWT-ul
    const expirationTime = decoded.exp * 1000; // timestamp-ul expirării în milisecunde
    return Date.now() > expirationTime; // Returnează true dacă token-ul a expirat
  };

  // Funcție pentru a extrage datele (cursuri, examene, etc.)
  const fetchData = async (token, role) => {
    try {
      if (role === "SG") {
        const examsData = await getExamsForGroup(token);
        setExamsForGroup(examsData);
      }
    } catch (err) {
      navigateWithError(navigate, err.message, "Eroare la încărcarea datelor");
    }
  };

  // useEffect pentru a încărca datele atunci când componenta este montată
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    setUserRole(role);
  
    if (!token) {
      navigateWithError(navigate, "⚠️ Autentificare necesară.", "Token lipsă");
      return;
    }
  
    if (checkTokenExpiration(token)) {
      navigateWithError(navigate, "⚠️ Token expirat, te rugăm să te autentifici din nou.", "Token Expirat");
      return;
    }
  
    fetchData(token, role);
  }, [navigate]);

  const handleLogout = async () => {
    const token = localStorage.getItem("access_token");
  
    if (!token) {
      navigateWithError(navigate, "⚠️ Nu există un token de autentificare.", "Eroare token");
      return;
    }
  
    // Verificăm dacă token-ul este expirat
    if (checkTokenExpiration(token)) {
      navigateWithError(navigate, "⚠️ Token expirat, te rugăm să te autentifici din nou.", "Token Expirat");
      return;
    }
  
    try {
      // Apelăm logout din API
      await logout();  // Aici se va apela funcția de logout definită în API
  
      // Eliminăm token-ul și rolul din localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
  
      // Navigăm la pagina de login
      navigate("/");  // Navigăm la pagina de login
    } catch (err) {
      console.log(`Logout eșuat. Încercați din nou. ${err}`);
      navigateWithError(navigate, "Logout eșuat. Încercați din nou.", "Eroare logout");
    }
  };
  

  // Determină ce tab-uri să afișezi pe baza rolului
  const renderTabs = () => {
    switch (userRole) {
      case "ADM":
        return (
          <>
          
            <button className="tab-button" onClick={() => navigate("/users/secretary")}>Adauga secretar</button>
            <button className="tab-button" onClick={() => navigate("/users/professors")}>Profesori</button>
            <button className="tab-button" onClick={() => navigate("/descarcare")}>Gestionare fisiere</button>
            <button className="tab-button" onClick={() => navigate("/settings")}>Setări</button>
          </>
        );

      case "SEC":
        return (
          <>
            
            <button className="tab-button" onClick={() => navigate("/courses")}>Vizualizare cursuri</button>
            <button className="tab-button" onClick={() => navigate("/exam/all")}>Examene</button>
            <button className="tab-button" onClick={() => navigate("/users/professors")}>Profesori</button>
            {/* <button className="tab-button" onClick={() => navigate("/exam/for/group")}>Examene</button> */}
            <button className="tab-button" onClick={() => navigate("/descarcare")}>Gestionare fișiere</button>
            <button className="tab-button" onClick={() => navigate("/settings")}>Setări</button>
            
          </>
        );
      case "SG":
        return (
          <>
            <button className="tab-button" onClick={() => navigate("/exam/propose")}>Propune Examen</button>
            {/* <button className="tab-button" onClick={() => navigate("/exams/reschedule")}>Reprogramare examene respinse</button> */}
            <button className="tab-button" onClick={() => navigate("/exam/group")}>Vizualizare examene grupa</button>
            <button className="tab-button" onClick={() => navigate("/courses")}>Vizualizare cursuri</button>
          </>
        );
      case "CD":
        return (
          <>
            <button className="tab-button" onClick={() => navigate("/courses")}>Vizualizare cursuri</button>
            <button className="tab-button" onClick={() => navigate("/exam/by-status")}>Status examene </button>
            {/* <button className="tab-button" onClick={() => navigate("/exam/review")}>Revizuire examene</button> */}
            <button className="tab-button" onClick={() => navigate("/users/professors")}>Profesori</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="home-container">
      {!activeTab ? (
        <>
          <h1>Bine ai venit!</h1>
          <div className="tab-menu">
            {renderTabs()}
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>
        </>
      ) : null}

      <div className="tab-content">
        {loading && <div>Se încarcă detaliile examenului...</div>}
        {examDetails && !loading && <ExamDetails details={examDetails} />}
        
        {activeTab === "courses" && (
          <Courses courses={courses} setFilteredCourses={setFilteredCourses} />
        )}
        
        {activeTab === "settings" && (userRole === "ADM" || userRole === "SEC") && <Setari />}
        
      </div>
    </div>
  );
};

export default Home;
