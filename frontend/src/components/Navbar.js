import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import "../css/Navbar.css";

export default function Navbar({ role }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();

  const toggleMenu = () => setShowMenu(!showMenu);

  return (
    <div className="navbar-wrapper">
      {/* לוגו */}
      <div className="logo-container">
        <Link to="/">
          <img src="/logo.png" alt="Logo" className="logo-image" />
        </Link>
      </div>

      {/* קישורים */}
      <nav className="navbar">
        <ul className="navbar-links">
          {role === "guest" && (
            <>
              <li>
                <Link to="/recommended" className={`nav-link ${isActive("/recommended") ? "active" : ""}`}>
                  <img src="/icons/recommended.png" alt="Recommended" className="nav-icon" />
                  <span>Recommended Trips</span>
                </Link>
              </li>
              <li>
                <Link to="/ai" className={`nav-link ${isActive("/ai") ? "active" : ""}`}>
                  <img src="/icons/ai.png" alt="AI" className="nav-icon" />
                  <span>AI Trip Planner</span>
                </Link>
              </li>
            </>
          )}

          {role === "user" && (
            <>
              <li>
                <Link to="/my-trips" className={`nav-link ${isActive("/my-trips") ? "active" : ""}`}>
                  <img src="/icons/trips.png" alt="My Trips" className="nav-icon" />
                  <span>My Trips</span>
                </Link>
              </li>
              <li>
                <Link to="/recommended" className={`nav-link ${isActive("/recommended") ? "active" : ""}`}>
                  <img src="/icons/recommended.png" alt="Recommended" className="nav-icon" />
                  <span>Recommended Trips</span>
                </Link>
              </li>
              <li>
                <Link to="/ai" className={`nav-link ${isActive("/ai") ? "active" : ""}`}>
                  <img src="/icons/ai.png" alt="AI" className="nav-icon" />
                  <span>AI Trip Planner</span>
                </Link>
              </li>
            </>
          )}

          {role === "admin" && (
            <>
              <li>
                <Link to="/users" className={`nav-link ${isActive("/users") ? "active" : ""}`}>
                  <img src="/icons/users.png" alt="Users" className="nav-icon" />
                  <span>Users Management</span>
                </Link>
              </li>
              <li>
                <Link to="/recommended" className={`nav-link ${isActive("/recommended") ? "active" : ""}`}>
                  <img src="/icons/recommended.png" alt="Recommended" className="nav-icon" />
                  <span>Recommended Trips</span>
                </Link>
              </li>
              <li>
                <Link to="/ai" className={`nav-link ${isActive("/ai") ? "active" : ""}`}>
                  <img src="/icons/ai.png" alt="AI" className="nav-icon" />
                  <span>AI Trip Planner</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* תפריט פרופיל למשתמש ואדמין */}
      {(role === "user" || role === "admin") && (
        <div className="profile-menu-wrapper" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img
            src={user?.profile_image_url || "/icons/profile.png"}
            alt="User"
            className="profile-icon"
            onClick={toggleMenu}
          />
          <div className="profile-label">
            {role === "admin" ? "Hello Admin" : `Hello ${user?.username || "User"}`}
          </div>

          {showMenu && (
            <div className="profile-dropdown">
              <Link to="/profile" className="dropdown-link" onClick={() => setShowMenu(false)}>
                My Profile
              </Link>
              <button
                className="dropdown-link"
                onClick={() => {
                  localStorage.removeItem("token");
                  setShowMenu(false);
                  window.location.href = "/";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* כפתור התחברות לאורח */}
      {role === "guest" && (
        <div className="login-button-container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Link to="/login" className="login-button">Login</Link>
        </div>
      )}
    </div>
  );
}
