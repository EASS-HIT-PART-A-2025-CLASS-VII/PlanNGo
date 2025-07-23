import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile, forgotPassword, getProfile } from "../services/api";
import "../css/Profile.css";
import "../css/Form.css";
import uploadToCloudinary from "../services/cloudinary_service"

export default function Profile() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef();

  const [initialData, setInitialData] = useState({ username: "", imageUrl: "" });
  const [username, setUsername] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setImageUrl(user.profile_image_url || "");
      setInitialData({
        username: user.username || "",
        imageUrl: user.profile_image_url || "",
      });
    }
  }, [user?.username, user]);

  const updateImageOnly = async (file) => {
    try {
      const uploadedUrl = await uploadToCloudinary(file);
      await updateUserProfile({ update_profile_image_url: uploadedUrl });

      setImageUrl(uploadedUrl);
      setMessage("Profile image updated successfully!");
      setInitialData((prev) => ({ ...prev, imageUrl: uploadedUrl }));

      setUser((prevUser) => ({
        ...prevUser,
        profile_image_url: uploadedUrl,
      }));
    } catch {
      setMessage("Image upload failed");
    }
  };


  const handleUpdate = async () => {
    const payload = {};

    if (username && username !== initialData.username) {
      payload.update_username = username;
    }

    if (Object.keys(payload).length === 0) {
      setMessage("No changes made.");
      return;
    }

    try {
      await updateUserProfile(payload);
      setMessage("Profile updated successfully!");
      setInitialData((prev) => ({ ...prev, username }));

      const refreshed = await getProfile();
      setUser(refreshed.data);

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
    }
  };

  const handleResetRequest = async () => {
    try {
      await forgotPassword(user.email);
      setResetStatus("Reset link sent to your email.");
    } catch (err) {
      setResetStatus("Failed to send reset link.");
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMessage("");
      updateImageOnly(file);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>My Profile</h2>

        <div
          className="profile-image-wrapper"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Profile"
              onClick={handleImageClick}
              className="profile-image"
            />
          )}
          {hovering && (
            <div className="image-overlay">
              Click to change
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleImageChange}
        />

        <form onSubmit={(e) => e.preventDefault()}>
          <label>Email:</label>
          <input type="text" value={user?.email} disabled />

          <label>Username:</label>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setMessage("");
            }}
          />

          <button type="button" onClick={handleUpdate}>Update Profile</button>
        </form>

        <p className="bottom-text">
          Want to reset your password? {" "}
          <span className="link" onClick={handleResetRequest}>
            Click here
          </span>
        </p>

        {message && <p className="success">{message}</p>}
        {resetStatus && <p className="success">{resetStatus}</p>}
      </div>
    </div>
  );
}
