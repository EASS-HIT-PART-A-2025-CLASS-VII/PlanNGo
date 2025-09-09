import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaShareAlt,
  FaDollarSign,
  FaEnvelope,
  FaHeart,
  FaRegHeart,
  FaTrash,
  FaEdit,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaStar,
} from "react-icons/fa";
import {
  getTripShareLink,
  sendTripSummary,
  calculateTripBudget,
  toggleFavoriteTrip,
  isTripFavorite,
  deleteTrip,
  updateTrip,
  createTrip,
  convertToRecommended,
} from "../services/api";
import "../css/TripCard.css";
import uploadToCloudinary from "../services/cloudinary_service"

export default function TripCard({ trip, onUnfavorited, onDeleted, onUpdated }) {
  const { user } = useAuth();
  const [budget, setBudget] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [travelerCount, setTravelerCount] = useState("");
  const [showTravelersModal, setShowTravelersModal] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [isEditing, setIsEditing] = useState(typeof trip.id === "string" && trip.id.startsWith("temp"));
  const [hovering, setHovering] = useState(false);
  const fileInputRef = useRef();
  const [editedTrip, setEditedTrip] = useState({ ...trip });
  const [tripImage, setTripImage] = useState(trip.image_url);

  const navigate = useNavigate();

  const defaultImage = "/default-trip.png"; 

  useEffect(() => {
    if (typeof editedTrip.id === "number") {
      isTripFavorite(editedTrip.id)
        .then((res) => setIsFavorite(res.data.is_favorite))
        .catch(() => {});
    }
  }, [editedTrip.id]);

  const handleClick = () => {
    if (!isEditing) navigate(`/trips/${editedTrip.id}`);
  };

  const handleFavoriteToggle = async (e) => {
    e.stopPropagation();
    try {
      await toggleFavoriteTrip(editedTrip.id);
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      if (!newStatus && onUnfavorited) {
        onUnfavorited(editedTrip.id);
      }
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

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      const res = await getTripShareLink(editedTrip.id);
      const url = res.data.share_link;
      await navigator.share({ title: editedTrip.title, text: editedTrip.description, url });
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

  const handleCalendarSync = (e) => {
    e.stopPropagation();
    if (!editedTrip.start_date || !editedTrip.end_date) {
      alert("Please enter both start and end dates before syncing to calendar.");
      return;
    }
    const url = `http://localhost:8000/api/calendar/authorize?trip_id=${editedTrip.id}`;
    window.open(url, "_blank");
  };

  const handleBudget = async () => {
    try {
      setLoadingBudget(true);
      const num = parseInt(travelerCount, 10) || 1;
      const res = await calculateTripBudget(editedTrip.id, num);
      setBudget(res.data.estimated_budget);
      setShowTravelersModal(false);
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
      setLoadingBudget(false);
    }
  };

  const handleSummary = async (e) => {
    e.stopPropagation();
    try {
      await sendTripSummary(editedTrip.id);
      alert("Trip summary sent to your email.");
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

  const handleEditToggle = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleEditChange = (field, value) => {
    setEditedTrip((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (e) => {
    e.stopPropagation();
    try {
      if (typeof trip.id === "string" && trip.id.startsWith("temp")) {
        const created = await createTrip(editedTrip);
        alert("Trip created successfully.");

        setTripImage(created.image_url);
        setEditedTrip(created);
        setIsEditing(false);

        if (onUpdated) {
          onUpdated(trip.id, created.data);
        }

        return;
      }

      const updated = await updateTrip(trip.id, editedTrip);
      alert("Trip updated successfully.");
      setTripImage(updated.image_url);
      setEditedTrip(updated);
      setIsEditing(false);

      if (onUpdated) {
        onUpdated(trip.id, updated);
      }
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

  const handleEditCancel = (e) => {
    e.stopPropagation();

    if (typeof trip.id === "string" && trip.id.startsWith("temp")) {
      if (onDeleted) onDeleted(trip.id); 
      return;
    }

    setEditedTrip({ ...trip });
    setTripImage(trip.image_url);
    setIsEditing(false);
  };


  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        await deleteTrip(editedTrip.id);
        alert("Trip deleted successfully.");
        if (onDeleted) onDeleted(editedTrip.id);
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
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadToCloudinary(file);
      setTripImage(url);
      setEditedTrip((prev) => ({ ...prev, image_url: url }));
    }
  };

  const handleConvertToRecommended = async (e) => {
    e.stopPropagation();
    try {
      await convertToRecommended(trip.id);
      alert("Trip converted to recommended.");
      navigate("/recommended");
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

  return (
    <>
      <div className="trip-card" onClick={handleClick} style={{ cursor: "pointer" }}>
        {user?.is_admin && (
          <button
            className="trip-btn icon convert-btn"
            onClick={handleConvertToRecommended}
            title="Convert to Recommended"
          >
            <FaStar />
          </button>
        )}
        {isEditing ? (
          <div className="trip-image-edit-wrapper" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
            <img src={tripImage || defaultImage} alt="Trip" onClick={handleImageClick} className="trip-image-edit" />
            {hovering && <div className="image-overlay">Click to change</div>}
            <input type="file" accept="image/*" style={{ display: "none" }} ref={fileInputRef} onChange={handleImageChange} />
          </div>
        ) : (
          <img src={trip.image_url && trip.image_url.trim() !== "" ? trip.image_url : defaultImage} alt={trip.title} className="trip-image" />
        )}

        <div
          className="trip-actions-top"
          style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}
        >
          {isEditing ? (
            <>
              <button className="trip-btn icon" onClick={handleEditSave} title="Save">
                <FaCheck />
              </button>
              <button className="trip-btn icon" onClick={handleEditCancel} title="Cancel">
                <FaTimes />
              </button>
            </>
          ) : (
            !user?.is_admin && (
              <>
                <button className="trip-btn icon" onClick={handleFavoriteToggle} title="Favorite">
                  {isFavorite ? <FaHeart size={22} /> : <FaRegHeart size={22} />}
                </button>
                <button className="trip-btn icon" onClick={handleShare} title="Share">
                  <FaShareAlt />
                </button>
                <button className="trip-btn icon" onClick={handleCalendarSync} title="Sync to Calendar">
                  <FaCalendarAlt />
                </button>
              </>
            )
          )}
        </div>


        {isEditing ? (
          <div className="trip-edit-controls">
            <div className="input-with-icon">
              <span className="icon">📌</span>
              <input
                  value={editedTrip.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  placeholder="Title"
                  required
              />
            </div>

            <div className="input-with-icon">
              <span className="icon">📍</span>
              <input
                  value={editedTrip.destination || ""}
                  onChange={(e) => handleEditChange("destination", e.target.value)}
                  placeholder="Destination"
                  required
              />
            </div>

            <div className="input-with-icon">
              <span className="icon">📝</span>
              <textarea value={editedTrip.description || ""} onChange={(e) => handleEditChange("description", e.target.value)} placeholder="Description" />
            </div>

            <div className="input-with-icon">
              <span className="icon">⏳</span>
              <input
                type="number"
                placeholder="Duration"
                value={editedTrip.duration_days ?? ""}
                onChange={(e) =>
                  handleEditChange("duration_days", e.target.value ? parseInt(e.target.value, 10) : "")
                }
              />
            </div>
            {["start_date", "end_date"].map((key) => (
              <div key={key} className="input-with-icon">
                <span className="icon">🗓️</span>
                <input type="date" value={editedTrip[key] || ""} onChange={(e) => handleEditChange(key, e.target.value)} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <h3 className="trip-card-title">{editedTrip.title}</h3>
            <div className="trip-info">
              <p><span className="icon">📍</span>{editedTrip.destination}</p>
              <p><span className="icon">📝</span>{editedTrip.description}</p>
              <p><span className="icon">⏳</span>{editedTrip.duration_days} days</p>
              <p><span className="icon">🗓️</span>{editedTrip.start_date} - {editedTrip.end_date}</p>
        
            </div>
          </>
        )}

        {!isEditing && (
          <div className="trip-actions">
            <button className="trip-btn outline" onClick={(e) => { e.stopPropagation(); setShowTravelersModal(true); }}>
              <FaDollarSign /> {budget != null ? `${budget} ` : "Budget"}
            </button>
            <button className="trip-btn outline" onClick={handleSummary}>
              <FaEnvelope /> Summary
            </button>
          </div>
        )}

        {!user?.is_admin && (
          <div className="trip-actions-side">
            {!isEditing && (
              <>
                <button className="trip-btn icon" onClick={handleEditToggle} title="Edit Trip">
                  <FaEdit />
                </button>
                <button className="trip-btn icon" onClick={handleDelete} title="Delete Trip">
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showTravelersModal && (
        <div className="modal-overlay" onClick={() => setShowTravelersModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <button className="modal-close" onClick={() => setShowTravelersModal(false)}>×</button>
              <h3>Number of Travelers</h3>
              <input
                type="number"
                placeholder="Enter number..."
                value={travelerCount}
                onChange={(e) => setTravelerCount(e.target.value)}
              />
              <button onClick={handleBudget} className="modal-btn">
                {loadingBudget ? "Calculating..." : "Calculate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
