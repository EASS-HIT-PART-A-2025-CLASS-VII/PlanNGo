import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStar,
  FaShareAlt,
  FaRegCommentDots,
  FaDollarSign,
  FaEnvelope,
  FaSuitcase,
  FaHeart,
  FaRegHeart
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  getRecommendedShareLink,
  calculateTripBudget,
  sendRecommendedTripSummary,
  rateTrip,
  cloneRecommendedTrip,
  getTripShareLink,
  toggleFavoriteRecommended,
  isRecommendedFavorite
} from "../services/api";
import RecommendedComments from "./RecommendedComments";
import "../css/TripCard.css";

export default function RecommendedTripCard({ trip, onUnfavorited }) {
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  const isLoggedIn = !!user && !isAdmin;

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
  const defaultImage =
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";

  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn && trip.is_recommended) {
      isRecommendedFavorite(trip.id)
        .then((res) => setIsFavorite(res.data.is_favorite))
        .catch(() => {});
    }
  }, [trip.id, isLoggedIn]);

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
      console.error("Toggle favorite failed", err);
    }
  };

  const handleClick = () => {
    navigate(`/trips/${trip.id}`);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      let res;
      if (trip.is_recommended) {
        res = await getRecommendedShareLink(trip.id);
      } else {
        res = await getTripShareLink(trip.id);
      }

      const url = res.data.share_link;

      await navigator.share({
        title: trip.title,
        text: trip.description,
        url,
      });
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleBudget = async (e) => {
    e.stopPropagation();
    try {
      setLoadingBudget(true);
      const num = parseInt(travelerCount, 10) || 1;
      const res = await calculateTripBudget(trip.id, num);
      setBudget(res.data.estimated_budget);
      setShowTravelersModal(false);
    } catch (err) {
      console.error("Budget error", err);
      alert("Failed to calculate budget");
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
      console.error("Email summary error", err);
      alert("Failed to send email");
    }
  };

  const handleSummaryClick = (e) => {
    e.stopPropagation();
    if (user?.email) {
      handleSummaryEmail(user.email);
    } else {
      setShowEmailModal(true);
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
      alert("Thanks for rating!");
      setAverageRating(value);
      setShowRateModal(false);
      setRatingInput("");
    } catch {
      alert("Failed to rate trip");
    }
  };

  const handleClone = async (e) => {
    e.stopPropagation();
    try {
      await cloneRecommendedTrip(trip.id);
      alert("Trip cloned to My Trips!");
      navigate("/my-trips");
    } catch {
      alert("Clone failed");
    }
  };

  return (
    <>
      <div className="trip-card" onClick={handleClick} style={{ cursor: "pointer" }}>
        <img
          src={trip.image_url && trip.image_url.trim() !== "" ? trip.image_url : defaultImage}
          alt={trip.title}
          className="trip-image"
        />

        <div className="trip-rating-wrapper">
          <div className="trip-rating">
            <FaStar /> {averageRating != null ? averageRating.toFixed(1) : "-"}
          </div>
          {isLoggedIn && (
            <span
              className="rate-now-link"
              onClick={(e) => {
                e.stopPropagation();
                setShowRateModal(true);
              }}
            >
              Rate the trip
            </span>
          )}
        </div>

        <div className="trip-actions-top" style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          {isLoggedIn && trip.is_recommended && (
            <button
              className={`trip-btn icon favorite-btn ${isFavorite ? "filled" : ""}`}
              onClick={handleFavoriteToggle}
              title="Favorite"
            >
              {isFavorite ? <FaHeart size={22} /> : <FaRegHeart size={22} />}
            </button>
          )}
          <button className="trip-btn icon" onClick={handleShare} title="Share">
            <FaShareAlt />
          </button>
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
          {isLoggedIn && (
            <button className="trip-btn icon" onClick={handleClone} title="Add to My Trips">
              <FaSuitcase />
            </button>
          )}
        </div>

        <h3 className="trip-card-title">{trip.title}</h3>

        <div className="trip-info">
          <p><span className="icon">📍</span>{trip.destination}</p>
          <p><span className="icon">📝</span>{trip.description}</p>
          <p><span className="icon">⏳</span>{trip.duration_days} days</p>
          <p><span className="icon">🗓️</span>{trip.start_date} - {trip.end_date}</p>
        </div>

        <div className="trip-actions">
          <button
            className="trip-btn outline"
            title="Estimate budget"
            onClick={(e) => {
              e.stopPropagation();
              setShowTravelersModal(true);
            }}
          >
            <FaDollarSign />
            {budget != null ? `${budget} $` : "Budget"}
          </button>

          <button
            className="trip-btn outline"
            title="Send trip summary to email"
            onClick={handleSummaryClick}
          >
            <FaEnvelope /> Summary
          </button>
        </div>

        {isAdmin && (
          <div className="trip-actions">
            <button className="trip-btn admin" onClick={(e) => e.stopPropagation()}>Edit</button>
            <button className="trip-btn admin" onClick={(e) => e.stopPropagation()}>Delete</button>
            <button className="trip-btn admin" onClick={(e) => e.stopPropagation()}>Create New</button>
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
          user={user}
          onClose={() => setShowCommentsModal(false)}
        />
      )}
    </>
  );
}