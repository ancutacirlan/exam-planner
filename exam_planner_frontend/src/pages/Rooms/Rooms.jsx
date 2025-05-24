import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRooms } from "../../api/api";
import navigateWithError from "../../utils/navigateWithError";
import "./Rooms.css";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigateWithError(navigate, "⚠️ Autentificare necesară.", "Token lipsă");
      return;
    }

    const role = localStorage.getItem("user_role"); // presupunem că rolul este salvat în localStorage
    setUserRole(role);

    fetchRooms(token)
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(data);
        } else {
          setError("Datele nu sunt în formatul corect.");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
        navigateWithError(navigate, err.message, "Eroare la încărcarea sălilor");
      });
  }, [navigate]);

  return (
    <div className="rooms-container">
      {isLoading ? (
        <p className="loading-message">Se încarcă sălile...</p> // Mesajul de încărcare
      ) : (
        <>
          <div className="rooms-header">
            <h2>Sălile de clasă</h2>
            <span className="room-count">{rooms.length} săli</span> {/* Numărul de săli */}
          </div>

          <div className="table-container">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nume</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length > 0 ? (
                  rooms.map((room) => (
                    <tr key={room.room_id} className="clickable-row">
                      <td>{room.room_id}</td>
                      <td>{room.name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">Nu sunt săli disponibile.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {error && <div className="error-message">{error}</div>} {/* Afișarea mesajului de eroare */}
    </div>
  );
};

export default Rooms;
