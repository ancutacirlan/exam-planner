import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../api/config";
import navigateWithError from "../../utils/navigateWithError"; // Importăm funcția de navigare
import "./Landing.css";
import logoUsv from "../../assets/logo-usv.jpg";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const role = params.get("role");
    const error = params.get("error");

    if (error) {
      // Navigăm la pagina de eroare dacă există un parametru de eroare
      navigateWithError(
        navigate,
        `Autentificare eșuată: ${error.replace(/_/g, " ")}`,
        "Eroare autentificare"
      );
      return;
    }

    if (token && role) {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_role", role);
      navigate("/home");
    }
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = `${BASE_URL}/login`;
  };

  return (
    <div className="landing-container">
      <div className="login-card">
        <img src={logoUsv} alt="USV Logo" className="usv-logo" />
        <h1>Exam Planner</h1>
        <p>Platformă academică pentru gestiunea examenelor</p>
        <button className="login-button" onClick={handleLogin}>
          🔐 Autentificare cu contul Google
        </button>
      </div>
    </div>
  );
};

export default Landing;
