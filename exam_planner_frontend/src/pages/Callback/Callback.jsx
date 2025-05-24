import { useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Importă useNavigate pentru a naviga
import ErrorPage from "../ErrorPage/ErrorPage"; // Asigură-te că ai importat ErrorPage corect

const decodeJwt = (token) => {
  // Împărțim tokenul în cele 3 părți: header, payload și signature
  const base64Url = token.split('.')[1]; // Obținem partea a doua (payload)

  // Decodificăm din Base64 URL-safe în Base64
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  // Decodificăm Base64 în JSON
  const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  console.log(jsonPayload);
  // Returnăm obiectul decodat
  return JSON.parse(jsonPayload);
};

const Callback = () => {
  const navigate = useNavigate(); // Hook-ul pentru navigare

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      try {
        const decoded = decodeJwt(token);  // Decodăm manual tokenul
        console.log("Decoded JWT:", decoded);
        
        // Salvează tokenul și rolul în localStorage
        localStorage.setItem("access_token", token);
        localStorage.setItem("user_role", decoded.role);

        // Redirecționează către Home
        navigate("/home");
      } catch (error) {
        console.error("Eroare la decodarea tokenului:", error);

        // Dacă apare o eroare, navighează către ErrorPage
        navigate("/error", { state: { message: "Eroare la procesarea tokenului" } });
      }
    } 
  }, [navigate]);

  return <div>Procesare...</div>;
};

export default Callback;


