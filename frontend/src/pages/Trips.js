import { useEffect, useState } from "react";
import {
  getMyTrips,
  searchTrips,
  getFavoriteTrips,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import TripCard from "../components/TripCard";
import { FaSearch, FaHeart, FaThList, FaPlus } from "react-icons/fa";
import "../css/RecommendedTrips.css";
import "../css/TripCard.css";
import "../css/SortDropdown.css";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      setLoading(true);
      try {
        if (!searchQuery.trim()) {
          const res = await getMyTrips({ page, sortBy });
          setTrips(res.data.trips);
          setTotal(res.data.total);
          setMode("all");
        } else {
          const res = await searchTrips(searchQuery);
          setTrips(res.data);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, page, sortBy]);

  const handleFavorites = async () => {
    try {
      setLoading(true);
      const res = await getFavoriteTrips();
      setTrips(res.data);
      setMode("favorites");
    } catch (error) {
      console.error("Favorites fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInlineCreate = () => {
    const tempId = `temp-${Date.now()}`;
    const newTrip = {
      id: tempId,
      user_id: user.id,
      title: "",
      destination: "",
      description: null,
      is_recommended: false,
      duration_days: null,
      start_date: null,
      end_date: null,
      image_url: null,
      average_rating: null,
    };
    setTrips((prev) => [newTrip, ...prev]);
  };

  const handleUnfavorited = (tripId) => {
    if (mode === "favorites") {
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    }
  };

  const sortOptions = [
    { value: "recent", label: "🕓 Most Recent" },
    { value: "random", label: "🎲 Random" },
    { value: "start_soonest", label: "🚀 Start Soonest" },
  ];

  return (
    <div className="recommended-page">
      <div className="recommended-header">
        <div className="search-container">
          <div className="search-icon-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search my trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="recommended-buttons">
          <div className="sort-dropdown">
            <button className="trip-btn outline" onClick={() => setShowSortMenu((prev) => !prev)}>
              Sort By <span style={{ fontSize: "1.5rem", marginLeft: "4px" }}>▾</span>
            </button>
            {showSortMenu && (
              <div className="sort-menu">
                {sortOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`sort-item ${option.value === sortBy ? "selected" : ""}`}
                    onClick={() => {
                      setSortBy(option.value);
                      setPage(1);
                      setShowSortMenu(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {user && (
            <button
              onClick={handleFavorites}
              className="trip-btn outline favorites-btn"
            >
              Favorites <FaHeart /> 
            </button>
          )}
          <button onClick={handleInlineCreate} className="trip-btn outline">
            Create New <FaPlus /> 
          </button>
        </div>
      </div>

      <div className="trip-grid">
        {loading ? (
          <p>Loading trips...</p>
        ) : trips.length === 0 ? (
          <p>No trips found.</p>
        ) : (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onUnfavorited={mode === "favorites" ? handleUnfavorited : null}
              onUpdated={(oldId, updatedTrip) => {
                setTrips((prevTrips) =>
                  [updatedTrip, ...prevTrips.filter((t) => t.id !== oldId)]
                );
              }}
              onDeleted={(id) => {
                setTrips((prevTrips) => prevTrips.filter((t) => t.id !== id));
              }}
            />
          ))
        )}
      </div>

      {!loading && trips.length > 0 && mode !== "favorites" && (
        <div className="pagination-controls">
          <button
            className="trip-btn outline"
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Previous
          </button>

          <span style={{ margin: "0 1rem" }}>Page {page}</span>

          <button
            className="trip-btn outline"
            disabled={page * 8 >= total}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
