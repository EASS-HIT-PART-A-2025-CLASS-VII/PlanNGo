import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStar,
  FaShareAlt,
  FaRegCommentDots,
  FaDollarSign,
  FaEnvelope,
  FaSuitcase,
  FaHeart,
  FaRegHeart,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  getRecommendedShareLink,
  calculateTripBudget,
  sendRecommendedTripSummary,
  rateTrip,
  cloneRecommendedTrip,
  toggleFavoriteRecommended,
  isRecommendedFavorite,
  updateRecommendedTrip,
  deleteRecommendedTrip,
  createRecommendedTrip
} from "../services/api";
import RecommendedComments from "./RecommendedComments";
import "../css/TripCard.css";

export default function RecommendedTripCard({ trip, onUnfavorited, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  const isLoggedIn = !!user && !isAdmin;
  const navigate = useNavigate();

  const [budget, setBudget] = useState(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTravelersModal, setShowTravelersModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [travelerCount, setTravelerCount] = useState("");
  const [ratingInput, setRatingInput] = useState("");
  const [averageRating, setAverageRating] = useState(trip.average_rating || null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditing, setIsEditing] = useState(typeof trip.id === "string" && trip.id.startsWith("temp"));
  const [editedTrip, setEditedTrip] = useState({ ...trip });
  const [hovering, setHovering] = useState(false);
  const fileInputRef = useRef();
  const [tripImage, setTripImage] = useState(trip.image_url);

  const defaultImage = "/default-trip.png"; 
  useEffect(() => {
    if (isLoggedIn && trip.is_recommended) {
      isRecommendedFavorite(trip.id)
        .then((res) => setIsFavorite(res.data.is_favorite))
        .catch(() => {});
    }
  }, [trip.id, isLoggedIn]);

  const handleClick = () => {
    if (!isEditing) navigate(`/trips/${trip.id}`);
  };

  const handleFavoriteToggle = async (e) => {
    e.stopPropagation();
    try {
      await toggleFavoriteRecommended(trip.id);
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      if (!newStatus && onUnfavorited) {
        onUnfavorited(trip.id);
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
      const res = await getRecommendedShareLink(trip.id);
      const url = res.data.share_link;
      await navigator.share({ title: trip.title, text: trip.description, url });
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

  const handleBudget = async (e) => {
    e.stopPropagation();
    try {
      setLoadingBudget(true);
      const num = parseInt(travelerCount, 10) || 1;
      console.log("start calc")
      const res = await calculateTripBudget(trip.id, num);
      console.log("end calc")
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

  const handleSummaryEmail = async (emailToSend) => {
    try {
      await sendRecommendedTripSummary(trip.id, emailToSend);
      alert("Trip summary sent successfully");
      setEmailInput("");
      setShowEmailModal(false);
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

  const handleRating = async () => {
    const value = parseInt(ratingInput);
    if (isNaN(value) || value < 1 || value > 5) {
      alert("Please enter a rating between 1 and 5.");
      return;
    }

    try {
      await rateTrip(trip.id, value);
      window.location.reload();
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

  const handleClone = async (e) => {
    e.stopPropagation();
    try {
      await cloneRecommendedTrip(trip.id);
      alert("Trip cloned to My Trips!");
      navigate("/my-trips");
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
        const created = await createRecommendedTrip(editedTrip);
        alert("Trip created successfully.");
        if (created) {
          // עדכון פנימי
          setTripImage(created.image_url);
          setEditedTrip(created);
          setIsEditing(false);
  
          if (onUpdated) {
            onUpdated(trip.id, created.data);
          }
  
          return;
        }
      }

      // עדכון רגיל
      const updated = await updateRecommendedTrip(trip.id, editedTrip);
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
    if (!window.confirm("Are you sure you want to delete this trip?")) return;
    try {
      await deleteRecommendedTrip(trip.id);
      alert("Trip deleted successfully.");
      if (onDeleted) onDeleted(trip.id);
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

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset");
    const res = await fetch("https://api.cloudinary.com/v1_1/dwjhklkuy/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
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
  return (
    <>
      <div className="trip-card" onClick={handleClick} style={{ cursor: "pointer" }}>
        {isEditing ? (
          <div className="trip-image-edit-wrapper" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
            <img src={tripImage || defaultImage} alt="Trip" onClick={handleImageClick} className="trip-image-edit" />
            {hovering && <div className="image-overlay">Click to change</div>}
            <input type="file" accept="image/*" style={{ display: "none" }} ref={fileInputRef} onChange={handleImageChange} />
          </div>
        ) : (
          <img src={trip.image_url && trip.image_url.trim() !== "" ? trip.image_url : defaultImage} alt={trip.title} className="trip-image" />
        )}

        {!isAdmin && (
          <div className="trip-rating-wrapper">
            <div className="trip-rating">
              <FaStar /> {averageRating != null ? averageRating.toFixed(1) : "-"}
            </div>
            {isLoggedIn && (
              <span className="rate-now-link" onClick={(e) => { e.stopPropagation(); setShowRateModal(true); }}>
                Rate the trip
              </span>
            )}
          </div>
        )}
        {isAdmin && (
          <div className="trip-rating-wrapper">
            <div className="trip-rating">
              <FaStar /> {averageRating != null ? averageRating.toFixed(1) : "-"}
            </div>
          </div>
        )}

        <div className="trip-actions-top">
          {!isAdmin && isLoggedIn && trip.is_recommended && (
            <button className={`trip-btn icon favorite-btn ${isFavorite ? "filled" : ""}`} onClick={handleFavoriteToggle} title="Favorite">
              {isFavorite ? <FaHeart size={22} /> : <FaRegHeart size={22} />}
            </button>
          )}

          {!isAdmin && (
            <>
              <button className="trip-btn icon" onClick={handleShare} title="Share"><FaShareAlt /></button>
              <button
                className="trip-btn icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommentsModal(true);
                }}
                title="Comments"
              >
                <FaRegCommentDots />
              </button>
              {isLoggedIn && <button className="trip-btn icon" onClick={handleClone} title="Add to My Trips"><FaSuitcase /></button>}
            </>
          )}

          {isAdmin && (
            isEditing ? (
              <>
                <button className="trip-btn icon" onClick={handleEditSave}><FaCheck /></button>
                <button className="trip-btn icon" onClick={handleEditCancel}><FaTimes /></button>
              </>
            ) : (
              <>
                <button
                  className="trip-btn icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommentsModal(true);
                  }}
                  title="View Comments"
                >
                  <FaRegCommentDots />
                </button>
                <button className="trip-btn icon" onClick={handleEditToggle}><FaEdit /></button>
                <button className="trip-btn icon" onClick={handleDelete}><FaTrash /></button>
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
              <textarea
                value={editedTrip.description || ""}
                onChange={(e) => handleEditChange("description", e.target.value)}
                placeholder="Description"
              />
            </div>
            <div className="input-with-icon">
              <span className="icon">⏳</span>
              <input
                type="number"
                value={editedTrip.duration_days || ""}
                onChange={(e) => handleEditChange("duration_days", e.target.value)}
                placeholder="Duration"
                required
              />
            </div>
          </div>
        ) : (
          <>
            <h3 className="trip-card-title">{editedTrip.title}</h3>
            <div className="trip-info">
              <p><span className="icon">📍</span>{editedTrip.destination}</p>
              <p><span className="icon">📝</span>{editedTrip.description}</p>
              <p><span className="icon">⏳</span>{editedTrip.duration_days} days</p>
            </div>
          </>
        )}

        {!isAdmin && (
          <div className="trip-actions">
            <button className="trip-btn outline" onClick={(e) => { e.stopPropagation(); setShowTravelersModal(true); }}>
              <FaDollarSign /> {budget != null ? `${budget} $` : "Budget"}
            </button>
            <button className="trip-btn outline" onClick={(e) => { e.stopPropagation(); setShowEmailModal(true); }}>
              <FaEnvelope /> Summary
            </button>
          </div>
        )}
      </div>

      {/* Email modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <button className="modal-close" onClick={() => setShowEmailModal(false)}>×</button>
              <h3>Send Summary</h3>
              <input
                type="email"
                placeholder="Enter email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <button onClick={() => handleSummaryEmail(emailInput)} className="modal-btn">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget modal */}
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

      {/* Rating modal */}
      {showRateModal && (
        <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <button className="modal-close" onClick={() => setShowRateModal(false)}>×</button>
              <h3>Rate This Trip</h3>
              <input
                type="number"
                min="1"
                max="5"
                placeholder="1 to 5"
                value={ratingInput}
                onChange={(e) => setRatingInput(e.target.value)}
              />
              <button onClick={handleRating} className="modal-btn">Submit Rating</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments modal */}
      {showCommentsModal && (
        <RecommendedComments
          tripId={trip.id}
          user={isAdmin ? null : user} 
          onClose={() => setShowCommentsModal(false)}
        />
      )}
    </>
  );
}
