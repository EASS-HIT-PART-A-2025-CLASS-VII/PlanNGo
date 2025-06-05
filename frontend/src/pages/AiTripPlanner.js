import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTripTypes, generateCustomTrip } from "../services/api";
import "../css/Form.css";

export default function AiTripPlanner() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [travelers, setTravelers] = useState("");
  const [tripType, setTripType] = useState("");
  const [tripTypes, setTripTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTripTypes = async () => {
      try {
        const response = await getTripTypes();
        setTripTypes(response.data);
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

    fetchTripTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); 

    const request = {
      destination,
      num_days: Number(days),
      num_travelers: Number(travelers),
      trip_type: tripType,
    };

    try {
      const response = await generateCustomTrip(request);
      navigate("/ai/trip-result", {
        state: {
          destination,
          days,
          travelers,
          trip_type: tripType,
          ...response.data, 
        },
      });
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
        <h2>Plan Your Trip with AI</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="destination">Destination</label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />

          <label htmlFor="num_days">Number of Days</label>
          <input
            id="num_days"
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />

          <label htmlFor="num_travelers">Number of Travelers</label>
          <input
            id="num_travelers"
            type="number"
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            required
          />

          <label htmlFor="trip_type">Trip Style</label>
          <select
            id="trip_type"
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            required
          >
            <option value="">Select style...</option>
            {tripTypes.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="loading-button"
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}
