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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTripTypes = async () => {
      try {
        const response = await getTripTypes();
        setTripTypes(response.data);
      } catch (error) {
        console.error("Failed to load trip types:", error);
      }
    };

    fetchTripTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      
    } catch (error) {
      console.error("Failed to generate trip:", error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Plan Your Trip with AI</h2>
        <form onSubmit={handleSubmit}>
          <label>Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />

          <label>Number of Days</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />

          <label>Number of Travelers</label>
          <input
            type="number"
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            required
          />

          <label>Trip Style</label>
          <select
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

          <button type="submit">Generate Trip</button>
        </form>
      </div>
    </div>
  );
}
