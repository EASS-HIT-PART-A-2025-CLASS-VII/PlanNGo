import { useState } from "react";
import { login } from "../services/api";
import { Link } from "react-router-dom";
import "../css/Form.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); 
    try {
      const res = await login(email, password);
      localStorage.setItem("token", res.data.access_token);
      window.location.href = "/";
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false); 
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="👤  Email"
            value={email}
            onChange={handleInputChange(setEmail)}
            required
          />

          <input
            type="password"
            placeholder="🔒  Password"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
          />

          {error && <p className="error">{error}</p>}

          <div className="link-container">
            <Link to="/forgot-password" className="link">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className="loading-button" 
            disabled={isLoading}    
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="bottom-text">
            <span>Don't have an account? </span>
            <Link to="/signup" className="link">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
