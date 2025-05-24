import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { logout } from "../api/api";  // Importă funcția logout
import navigateWithError from "../utils/navigateWithError";

const LayoutWithNavbar = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    setUserRole(role);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigateWithError(navigate, "⚠️ Nu există un token de autentificare.", "Eroare token");
      return;
    }

    try {
      await logout();  // Apelează funcția logout din api.js
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
      navigate("/");
    } catch (err) {
      navigateWithError(navigate, "Logout eșuat. Încercați din nou.", "Eroare logout");
    }
  };

  return (
    <div>
      <Navbar userRole={userRole} onLogout={handleLogout} />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default LayoutWithNavbar;
