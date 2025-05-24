import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  downloadPDF,
  downloadExcel,
  downloadUserTemplate,
  uploadUsers,
} from "../../api/api";
import "./Descarcare.css";

// Verifică expirarea token-ului
const checkTokenExpiration = (token) => {
  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = decoded.exp * 1000;
    return Date.now() > expirationTime;
  } catch (err) {
    return true;
  }
};

const Descarcare = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [userRole, setUserRole] = useState(""); // Rolul utilizatorului
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) {
      const msg = "Token lipsă. Redirecționare...";
      setErrorMessage(msg);
      toast.error(msg);
      navigate("/");
    } else if (checkTokenExpiration(token)) {
      const msg = "Token expirat. Redirecționare...";
      setErrorMessage(msg);
      toast.error(msg);
      localStorage.removeItem("access_token");
      navigate("/");
    }

    const role = localStorage.getItem("user_role");
    setUserRole(role); // Salvează rolul utilizatorului
  }, [navigate, token]);

  const handleSync = async () => {
    const toastId = toast.loading("Se sincronizează datele...");
    try {
      const response = await syncData(token);
      toast.update(toastId, {
        render: "Datele au fost sincronizate cu succes!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      console.log("Sync response:", response);
    } catch (error) {
      const msg = `Eroare la sincronizare: ${error.message}`;
      setErrorMessage(msg);
      toast.update(toastId, {
        render: msg,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      console.error("Sync error:", error);
    }
  };

  const handleDownload = async (downloadFunc, fileName) => {
    const toastId = toast.loading("Se descarcă fișierul...");
    setErrorMessage("");

    try {
      const res = await downloadFunc(token);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      toast.update(toastId, {
        render: "Fișier descărcat cu succes!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      const msg = `Eroare la descărcare: ${err.message}`;
      setErrorMessage(msg);
      toast.update(toastId, {
        render: msg,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      console.error(err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      toast.error("Fișierul trebuie să fie un Excel valid.");
      return;
    }

    const toastId = toast.loading("Se încarcă fișierul...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadUsers(formData, token);
      if (res.success) {
        toast.update(toastId, {
          render: "Fișier încărcat cu succes!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.update(toastId, {
          render: res.message || "Eroare la încărcarea fișierului.",
          type: "error",
          isLoading: false,
          autoClose: 3000,
        });
      }
    } catch (err) {
      const msg = `Eroare la încărcare: ${err.message}`;
      setErrorMessage(msg);
      toast.update(toastId, {
        render: msg,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      console.error(err);
    }
  };

  return (
    <div className="settings-container">
      <ToastContainer />

      {/* Secțiunea de Descărcare Fișiere */}
      <div className="section-container">
        <h2 className="section-title">📥 Descărcare fișiere</h2>
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="form-btn-container">
          <button
            className="submit-btn"
            onClick={() => handleDownload(downloadPDF, "exams.pdf")}
          >
            Descarcă examene (PDF)
          </button>
          <button
            className="submit-btn"
            onClick={() => handleDownload(downloadExcel, "exams.xlsx")}
          >
            Descarcă examene (Excel)
          </button>
          <button
            className="submit-btn"
            onClick={() => handleDownload(downloadUserTemplate, "user-template.xlsx")}
          >
            Descarcă template utilizatori
          </button>
        </div>
      </div>

      {/* Secțiunea de Încărcare Fișiere */}
      {userRole === "SEC" || userRole === "ADM" ? (
        <div className="section-container">
          <h2 className="section-title">📤 Încărcare fișiere utilizatori</h2>

          <div className="upload-section">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="upload-input"
            />
          </div>
        </div>
      ) : (
        <p className="no-permission-message">Nu aveți permisiunea de a încărca fișiere.</p>
      )}
    </div>
  );
};

export default Descarcare;
