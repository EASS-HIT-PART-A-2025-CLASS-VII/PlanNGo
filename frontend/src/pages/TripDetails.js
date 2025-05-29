import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTripById } from "../services/api";
import DayCard from "../components/DayCard";
import { useAuth } from "../context/AuthContext";
import { FaPlus } from "react-icons/fa";
import "../css/TripDetails.css";

export default function TripDetails() {
  const { trip_id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await getTripById(trip_id);
        setTrip(response.data);
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
        setLoading(false);
      }
    };

    fetchTrip();
  }, [trip_id]);

  if (loading) return <p className="trip-loading">Loading trip details...</p>;
  if (!trip) return <p className="trip-error">Trip not found</p>;

  const canEdit = (trip, user) => {
    if (!user) return false;
    if (trip.is_recommended) return user.is_admin;
    return trip.user_id === user.id;
  };

  return (
    <>
      <div className="trip-details-header">
        <h1 className="trip-title">{trip.title}</h1>
        <div className="trip-info-block">
          <p>📍 {trip.destination}</p>
          <p>📝 {trip.description}</p>
          <p>⏳ {trip.duration_days} days</p>
          {!trip.is_recommended && (<p>📅 {trip.start_date} - {trip.end_date}</p>)}
        </div>
      </div>

      <div className="trip-grid-full">
        {Array.from({ length: trip.duration_days }).map((_, index) => (
          <DayCard
            key={index}
            index={index}
            tripId={trip.id}
            canEdit={canEdit(trip, user)}
          />
        ))}
      </div>
    </>
  );
}
