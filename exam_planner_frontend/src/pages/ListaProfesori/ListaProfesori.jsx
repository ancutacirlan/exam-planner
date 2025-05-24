import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfessors, deleteProfessor } from "../../api/api";
import navigateWithError from "../../utils/navigateWithError";
import "./ListaProfesori.css";

const ListaProfesori = () => {
  const [profesori, setProfesori] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // Obiect profesor
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const decodedToken = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < currentTime) {
      setError("Tokenul a expirat. Te rugăm să te autentifici din nou.");
      setIsLoading(false);
      return;
    }

    fetchProfessors(token)
      .then((data) => {
        if (Array.isArray(data)) setProfesori(data);
        else setError("Datele nu sunt în formatul corect.");
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
        navigateWithError(navigate, err.message, "Eroare la încărcarea profesorilor");
      });
  }, [navigate]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
  
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Token de autentificare lipsă");
      setSuccess("");
      setDeleteTarget(null); // 🔄 închide modalul și la eroare
      return;
    }
  
    try {
      await deleteProfessor(deleteTarget.user_id, token);
      setProfesori((prev) =>
        prev.filter((p) => p.user_id !== deleteTarget.user_id)
      );
      setSuccess(`Profesorul ${deleteTarget.name} a fost șters cu succes.`);
      setError("");
    } catch (err) {
      setError("Eroare la ștergere: " + err.message);
      setSuccess("");
    } finally {
      setDeleteTarget(null); // ✅ închide modalul indiferent de rezultat
    }
  };

  return (
    <div className="profesori-container">
      {isLoading ? (
        <p className="loading-message">Se încarcă profesorii...</p>
      ) : (
        <>
          <div className="profesori-header">
            <h2>Lista profesorilor</h2>
            <span className="prof-count">{profesori.length} profesori</span>
          </div>

          {/* Afișare mesaje */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="table-container">
            <table className="profesori-table">
              <thead>
                <tr>
                  <th>Nume</th>
                  <th>Email</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {profesori.length > 0 ? (
                  profesori.map((prof) => (
                    <tr
                      key={prof.user_id}
                      onClick={() => navigate(`/users/${prof.user_id}`)}
                      className="profesor-row"
                      style={{ cursor: "pointer" }}
                    >
                      <td>{prof.name}</td>
                      <td>{prof.email}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="delete-button"
                          onClick={() => setDeleteTarget(prof)}
                        >
                          Șterge
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">Nu sunt profesori disponibili.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal pentru confirmare ștergere */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <p>
              Ești sigur că vrei să ștergi profesorul{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="modal-buttons">
              <button className="confirm-button" onClick={handleDelete}>
                Confirmă
              </button>
              <button
                className="cancel-button"
                onClick={() => setDeleteTarget(null)}
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaProfesori;
