import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { sendAiTripSummary, cloneAiTrip, cloneAiTripAsRecommended, generateCustomTrip } from "../services/api";
import { useAuth } from "../context/AuthContext";
import DayCard from "../components/DayCard";
import "../css/TripCard.css";
import "../css/TripDetails.css";
import { FaEnvelope, FaSuitcase } from "react-icons/fa";

export default function AiTripResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const baseTrip = location.state;
  const { user } = useAuth();

  const [tripPlan, setTripPlan] = useState([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreChunks, setHasMoreChunks] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [estimatedBudget, setEstimatedBudget] = useState(0);
  const [firstChunk, setFirstChunk] = useState({ destination: "", days: 0, travelers: 0, trip_type: "" });

  const bottomRef = useRef(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!baseTrip) return;

    const fetchInitialChunk = async () => {
      try {
        const res = await generateCustomTrip({ ...baseTrip, offset: 0 });
        setTripPlan(res.trip_plan);
        setEstimatedBudget(res.estimated_budget);
        setCurrentOffset(10);
        setHasMoreChunks(res.trip_plan.length === 10);

        setFirstChunk({
          destination: baseTrip.destination,
          days: baseTrip.num_days,
          travelers: baseTrip.num_travelers,
          trip_type: baseTrip.trip_type,
        });
      } catch (err) {
        alert("Failed to load trip.");
      }
    };

    fetchInitialChunk();
  }, [baseTrip]);

  useEffect(() => {
    if (!hasMoreChunks || loadingMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          setLoadingMore(true);
          try {
            const res = await generateCustomTrip({ ...baseTrip, offset: currentOffset });
            setTripPlan((prev) => [...prev, ...res.trip_plan]);
            setEstimatedBudget((prev) => prev + (res.estimated_budget || 0));
            setCurrentOffset((prev) => prev + 10);
            if (res.trip_plan.length < 10) setHasMoreChunks(false);
          } catch (err) {
            alert("Failed to load more days");
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { threshold: 1 }
    );

    const ref = bottomRef.current;
    if (ref) observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [currentOffset, hasMoreChunks, loadingMore]);

  const handleSummaryEmail = async (emailToSend) => {
    try {
      setSending(true);
      await sendAiTripSummary({
        email: emailToSend,
        destination: firstChunk.destination,
        days: firstChunk.days,
        travelers: firstChunk.travelers,
        trip_type: firstChunk.trip_type,
        estimated_budget: estimatedBudget,
        trip_plan: tripPlan,
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
      const tripData = {
        destination: firstChunk.destination,
        duration_days: parseInt(firstChunk.days, 10),
        trip_plan: tripPlan,
        trip_type: firstChunk.trip_type,
        travelers: parseInt(firstChunk.travelers, 10),
      };

      if (user?.is_admin) {
        await cloneAiTripAsRecommended(tripData);
        alert("Trip added as a recommended trip!");
        navigate("/recommended");
      } else {
        await cloneAiTrip(tripData);
        alert("Trip added to your trips!");
        navigate("/my-trips");
      }
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Something went wrong");
    }
  };

  if (!baseTrip) {
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
          <h2 className="trip-title">Trip to: {firstChunk.destination}</h2>
          <div className="trip-header-actions">
            <button className="trip-btn icon" title="Send trip summary to email" onClick={handleClick}>
              <FaEnvelope />
            </button>
            {user && (
              <button
                className="trip-btn icon"
                title={user.is_admin ? "Add as recommended trip" : "Clone to my trips"}
                onClick={handleClone}
              >
                <FaSuitcase />
              </button>
            )}
          </div>
        </div>

        <div className="trip-details-icons">
          <div className="trip-detail-item">⏳ {firstChunk.days} days</div>
          <div className="trip-detail-item">👥 {firstChunk.travelers} travelers</div>
          <div className="trip-detail-item">🧳 {firstChunk.trip_type}</div>
          <div className="trip-detail-item">💸 ${estimatedBudget?.toFixed(2)}</div>
        </div>
      </div>

      <div className="trip-grid-full">
        {tripPlan.map((day) => (
          <DayCard key={day.day} index={day.day - 1} activities={day.activities} />
        ))}
        <div ref={bottomRef} style={{ height: "1px" }}></div>
      </div>

      {loadingMore && <div className="loading-spinner">Loading more days...</div>}

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
