import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./Navbar.css";

const Navbar = ({ onLogout, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBurger, setShowBurger] = useState(false);

  const navLinksRef = useRef(null);
  const headerRef = useRef(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const currentPath = location.pathname;
  const isActive = (path) => currentPath === path;

  useEffect(() => {
    const checkOverflow = () => {
      const nav = navLinksRef.current;
      const header = headerRef.current;
      if (!nav || !header) return;

      if (window.innerWidth > 768) {
        setShowBurger(false);
        setIsMobileMenuOpen(false);
        return;
      }

      if (window.innerWidth > 768) {
        setShowBurger(false);
        setIsMobileMenuOpen(false);
      } else {
        setShowBurger(true); // 🔧 forțăm să apară pe mobil
      }
    
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-header" ref={headerRef}>
          <span className="logo-text">🎓 USV Planificare Examene</span>

          {showBurger && (
            <button
              className={`burger ${isMobileMenuOpen ? "open" : ""}`}
              onClick={toggleMobileMenu}
              aria-label="Menu"
            >
              <div className="bar top"></div>
              <div className="bar middle"></div>
              <div className="bar bottom"></div>
            </button>
          )}
        </div>

        <div
          className={`navbar-links ${isMobileMenuOpen ? "open" : ""}`}
          ref={navLinksRef}
        >
          <button
            className={`tab-button ${isActive("/home") ? "active" : ""}`}
            onClick={() => {
              navigate("/home");
              setIsMobileMenuOpen(false);
            }}
          >
            Acasă
          </button>

          {userRole === "SEC" && (
            <>
              <button className={`tab-button ${isActive("/exam/all") ? "active" : ""}`} onClick={() => {
                navigate("/exam/all");
                setIsMobileMenuOpen(false);
              }}>
                Profesori
              </button>
              <button className={`tab-button ${isActive("/descarcare") ? "active" : ""}`} onClick={() => {
                navigate("/descarcare");
                setIsMobileMenuOpen(false);
              }}>
                Gestionare fișiere
              </button>
              <button className={`tab-button ${isActive("/settings") ? "active" : ""}`} onClick={() => {
                navigate("/settings");
                setIsMobileMenuOpen(false);
              }}>
                Setări
              </button>
            </>
          )}

          {userRole === "ADM" && (
            <>
              <button className={`tab-button ${isActive("/users/secretary") ? "active" : ""}`} onClick={() => {
                navigate("/users/secretary");
                setIsMobileMenuOpen(false);
              }}>
                Adaugare secretar
              </button>
              <button className={`tab-button ${isActive("/users/professors") ? "active" : ""}`} onClick={() => {
                navigate("/users/professors");
                setIsMobileMenuOpen(false);
              }}>
                Profesori
              </button>
              <button className={`tab-button ${isActive("/descarcare") ? "active" : ""}`} onClick={() => {
                navigate("/descarcare");
                setIsMobileMenuOpen(false);
              }}>
                Gestionare fișiere
              </button>
            </>
          )}

          {userRole === "SG" && (
            <>
              <button className={`tab-button ${isActive("/exam/propose") ? "active" : ""}`} onClick={() => {
                navigate("/exam/propose");
                setIsMobileMenuOpen(false);
              }}>
                Propune examen
              </button>

              {/* <button className="tab-button" onClick={() => navigate("/exam/group")}>Vizualizare examene grupa</button> */}
              <button className={`tab-button ${isActive("/exam/group") ? "active" : ""}`} onClick={() => {
                navigate("/exam/group");
                setIsMobileMenuOpen(false);
              }}>
                Examene grupa 
              </button>

              <button className={`tab-button ${isActive("/courses") ? "active" : ""}`} onClick={() => {
                navigate("/courses");
                setIsMobileMenuOpen(false);
              }}>
                Cursuri
              </button>
            </>
          )}

          {userRole === "CD" && (
            <>
              <button className={`tab-button ${isActive("/courses") ? "active" : ""}`} onClick={() => {
                navigate("/courses");
                setIsMobileMenuOpen(false);
              }}>
                Cursuri
              </button>
              <button className={`tab-button ${isActive("/exam/by-status") ? "active" : ""}`} onClick={() => {
                navigate("/exam/by-status");
                setIsMobileMenuOpen(false);
              }}>
                Examene în așteptare
              </button>
              <button className={`tab-button ${isActive("/users/professors") ? "active" : ""}`} onClick={() => {
                navigate("/users/professors");
                setIsMobileMenuOpen(false);
              }}>
                Profesori
              </button>
            </>
          )}

          <button className="logout-button" onClick={() => {
            onLogout();
            setIsMobileMenuOpen(false);
          }}>
            Logout
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && <div className="overlay" onClick={toggleMobileMenu}></div>}
    </>
  );
};

export default Navbar;
