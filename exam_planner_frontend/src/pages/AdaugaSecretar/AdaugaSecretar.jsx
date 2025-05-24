import { useState } from "react";
import { addSecretary } from "../../api/api";
import { useNavigate } from 'react-router-dom';
import './AdaugaSecretar.css';

const AdaugaSecretar = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");

    try {
      await addSecretary(token, { email, name });
      setSuccessMessage("Secretar adăugat cu succes!");
      setErrorMessage("");
      setEmail("");
      setName("");
    } catch (err) {
      const parsed = parseErrorMessage(err.message);
      setErrorMessage(parsed);
      setSuccessMessage("");
    }
  };

  const parseErrorMessage = (msg) => {
    try {
      const match = msg.match(/"message":"([^"]+)"/);
      return match ? match[1] : "A apărut o eroare.";
    } catch {
      return "Eroare necunoscută.";
    }
  };

  return (
    <div className="secretary-container">
      <form className="secretary-form" onSubmit={handleSubmit}>
        <h2 className="secretary-title">Adaugă un secretar nou</h2>

        {successMessage && (
          <div className="message-box success">
            <p>{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="message-box error">
            <p>{errorMessage}</p>
          </div>
        )}

        <input
          type="text"
          placeholder="Nume complet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email secretar"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="button-row">
        <button
            type="button"
            className="back-button"
            onClick={() => navigate('/home')}
        >
            Înapoi
        </button>
        <button type="submit" className="submit-button">
            Adaugă
        </button>
        </div>
      </form>
    </div>
  );
};

export default AdaugaSecretar;
