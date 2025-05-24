import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { sendAiTripSummary, cloneAiTrip } from "../services/api";
import { useAuth } from "../context/AuthContext";
import DayCard from "../components/DayCard";
import "../css/TripCard.css";
import "../css/TripDetails.css";
import { FaEnvelope, FaSuitcase } from "react-icons/fa";

export default function AiTripResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const trip = location.state;
  const { user } = useAuth();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSummaryEmail = async (emailToSend) => {
    try {
      setSending(true);
      await sendAiTripSummary({
        email: emailToSend,
        destination: trip.destination,
        days: trip.days,
        travelers: trip.travelers,
        trip_type: trip.trip_type,
        estimated_budget: trip.estimated_budget,
        trip_plan: trip.trip_plan,
      });
      alert("Summary sent successfully!");
      setShowEmailModal(false);
      setEmailInput("");
    } catch (error) {
      alert("Failed to send summary.");
    } finally {
      setSending(false);
    }
  };

  const handleClick = () => {
    if (user?.email) {
      handleSummaryEmail(user.email);
    } else {
      setShowEmailModal(true);
    }
  };

  const handleClone = async () => {
    try {
      console.log("Cloning trip:", trip);
      const tripData = {
        destination: trip.destination,
        duration_days: parseInt(trip.days, 10),
        trip_plan: trip.trip_plan,
        trip_type: trip.trip_type,
        travelers: parseInt(trip.travelers, 10),
      };
      console.log("Sending:", JSON.stringify(tripData, null, 2));
      await cloneAiTrip(tripData);
      alert("Trip added to your trips!");
      navigate("/my-trips");
    } catch (err) {
      alert("Failed to add trip");
    }
  };

  if (!trip) {
    return (
      <div className="trip-details-header">
        <h2>AI Trip Result</h2>
        <p>No Trip Data Found</p>
        <button onClick={() => navigate("/ai")}>Go Back</button>
      </div>
    );
  }

  return (
    <>
      <div className="trip-details-header">
        <div className="trip-header-top-row">
          <h2 className="trip-title">Trip to: {trip.destination}</h2>
          <div className="trip-header-actions">
            <button
              className="trip-btn icon"
              title="Send trip summary to email"
              onClick={handleClick}
            >
              <FaEnvelope />
            </button>
            {user && (
              <button
                className="trip-btn icon"
                title="Add to My Trips"
                onClick={handleClone}
              >
                <FaSuitcase />
              </button>
            )}
          </div>
        </div>

        <div className="trip-details-icons">
          <div className="trip-detail-item">
            <span role="img" aria-label="calendar">🗓️</span> {trip.days} days
          </div>
          <div className="trip-detail-item">
            <span role="img" aria-label="travelers">👥</span> {trip.travelers} travelers
          </div>
          <div className="trip-detail-item">
            <span role="img" aria-label="style">🧳</span> {trip.trip_type}
          </div>
          <div className="trip-detail-item">
            <span role="img" aria-label="budget">💸</span> ${trip.estimated_budget}
          </div>
        </div>
      </div>

      <div className="trip-grid-full">
        {trip.trip_plan.map((day) => (
          <DayCard key={day.day} index={day.day - 1} activities={day.activities} />
        ))}
      </div>

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
              <button onClick={() => handleSummaryEmail(emailInput)} className="modal-btn" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
