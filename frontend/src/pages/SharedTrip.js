import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getSharedRecommendedTrip, getSharedTrip } from "../services/api";

export default function SharedTripRedirect() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        let res;
        let tripId;

        if (location.pathname.includes("/shared/recommended")) {
          res = await getSharedRecommendedTrip(uuid);
          tripId = res.data.id;
        } else {
          res = await getSharedTrip(uuid);
          tripId = res.data.trip_id;
        }

        navigate(`/trips/${tripId}`);
      } catch (err) {
        console.error("Invalid shared link", err);
        navigate("/not-found");
      }
    };

    fetchAndRedirect();
  }, [uuid, navigate, location.pathname]);

  return <p>Redirecting to trip...</p>;
}
