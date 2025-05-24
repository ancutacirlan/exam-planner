// src/pages/ErrorPage/ErrorPage.jsx
import { useLocation, useNavigate } from "react-router-dom";

const ErrorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const errorMessage = location.state?.message || "A apărut o eroare necunoscută.";
  const errorType = location.state?.type || "Eroare generală";

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
      <h1>❌ {errorType}</h1>
      <p>{errorMessage}</p>
      <button onClick={() => navigate('/')} style={{ marginTop: "20px" }}>
        🔙 Înapoi
      </button>
    </div>
  );
};

export default ErrorPage;
