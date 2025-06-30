import { useState } from "react";
import { signup } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Form.css";
import uploadToCloudinary from "../services/cloudinary_service"

export default function Signup() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    profileImage: null,
  });

  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    let imageUrl = "";
    if (form.profileImage) {
      try {
        imageUrl = await uploadToCloudinary(form.profileImage);
      } catch {
        setError("Image upload failed");
        setIsLoading(false);
        return;
      }
    }

    try {
      await signup({
        username: form.username,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
        profile_image_url: imageUrl,
      });
      navigate("/login");
    } catch (err) {
      if (err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else if (err.response?.data) {
        alert(JSON.stringify(err.response.data));
      } else if (err.message) {
        alert(err.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Sign Up</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <label htmlFor="profile-upload">Profile Image (optional)</label>
          <input
            id="profile-upload"
            data-testid="profile-upload"
            type="file"
            name="profileImage"
            accept="image/*"
            onChange={handleChange}
          />

          <button type="submit" className="loading-button" disabled={isLoading}>
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
