import { useEffect, useState } from "react";
import {
  getRecommendedTrips,
  searchRecommendedTrips,
  getFavoriteRecommended,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import RecommendedTripCard from "../components/RecommendedTripCard";
import { FaSearch, FaRegHeart, FaPlus, FaHeart, FaSlidersH } from "react-icons/fa";
import "../css/RecommendedTrips.css";
import "../css/TripCard.css";
import "../css/SortDropdown.css";
import "../css/Pagination.css";

export default function RecommendedTrips() {
  const [trips, setTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { user } = useAuth();
  const [creatingInlineTrip, setCreatingInlineTrip] = useState(false);

  const totalPages = Math.ceil(total / 10);
  const isAdmin = user?.is_admin;

  useEffect(() => {
      if (creatingInlineTrip) return;

      const delaySearch = setTimeout(async () => {
        setLoading(true);
        try {
          if (!searchQuery.trim()) {
            const res = await getRecommendedTrips({ page, sortBy });
            setTrips(res.data.trips);
            setTotal(res.data.total);
            setMode("all");
          } else {
            const res = await searchRecommendedTrips({ query: searchQuery, page, sortBy });
            setTrips(res.data.trips);
            setTotal(res.data.total || 0); 
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
          setTrips([]);
        } finally {
          setLoading(false);
        }
      }, 500);
  
      return () => clearTimeout(delaySearch);
    }, [searchQuery, page, sortBy, creatingInlineTrip]);

  const handleFavoritesToggle = async () => {
    if (mode === "favorites") {
      try {
        setLoading(true);
        setMode("all");
        setSearchQuery("");
        setPage(1);
        const res = await getRecommendedTrips({ page: 1, sortBy });
        setTrips(res.data.trips);
        setTotal(res.data.total);
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
    } else {
      try {
        setLoading(true);
        const res = await getFavoriteRecommended();
        setTrips(res.data);
        setMode("favorites");
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
    }
  };


  const handleUnfavorited = (tripId) => {
    if (mode === "favorites") {
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    }
  };

  const handleInlineCreate = () => {
    const tempId = `temp-${Date.now()}`;
    const newTrip = {
      id: tempId,
      user_id: null,
      title: "",
      destination: "",
      description: null,
      is_recommended: true,
      duration_days: null,
      start_date: null,
      end_date: null,
      image_url: null,
      average_rating: null,
      created_at: null,
    };

    setCreatingInlineTrip(true);
    setTrips((prev) => [newTrip, ...prev]);
  };

  const sortOptions1 = [
    { value: "recent", label: "🕓 Most Recent" },
    { value: "random", label: "🎲 Random" },
    { value: "top_rated", label: "⭐ Top Rated" },
    { value: "favorites", label: "❤️ Most Favorited" },
  ];

  const sortOptions2 = [
    { value: "recent", label: "🕓 Most Recent" },
    { value: "random", label: "🎲 Random" },
    { value: "top_rated", label: "⭐ Top Rated" },
  ];

  const sortOptions = isAdmin ? sortOptions2 : sortOptions1;
    
    const fetchAllRecommendedTrips = async () => {
      try {
        setLoading(true);
        const res = await getRecommendedTrips({ page, sortBy });

        // אם העמוד הנוכחי התרוקן ויש דפים קודמים — נחזור אחורה
        if (res.data.trips.length === 0 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          setTrips(res.data.trips);
          setTotal(res.data.total);
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
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="recommended-page">
      <div className="recommended-header">
        <div className="search-container">
          <div className="search-icon-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
          </div>
        </div>

        <div className="recommended-buttons">
          <div className="sort-dropdown">
            <button className="icon-button" onClick={() => setShowSortMenu((prev) => !prev)} title="Sort by">
              <FaSlidersH />
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

          {user && !isAdmin && (
            <button
              onClick={handleFavoritesToggle}
              className="icon-button"
              title={mode === "favorites" ? "All trips" : "Favorites"}
            >
              {mode === "favorites" ? <FaHeart /> : <FaRegHeart />}
            </button>
          )}

          {isAdmin && (
            <button onClick={handleInlineCreate} className="icon-button" title="Create new trip">
              <FaPlus />
            </button>
          )}
        </div>
      </div>

      <div className="trip-grid">
        {loading ? (
          <p>Loading trips...</p>
        ) : trips.length === 0 ? (
          <p>No trips found.</p>
        ) : (
          trips.map((trip) => (
            <RecommendedTripCard
              key={trip.id}
              trip={trip}
              onUnfavorited={mode === "favorites" ? handleUnfavorited : null}
              onUpdated={(oldId, updatedTrip) => {
                setTrips((prevTrips) =>
                  [updatedTrip, ...prevTrips.filter((t) => t.id !== oldId)]
                );
                setCreatingInlineTrip(false);
              }}
              onDeleted={(id) => {
                setTrips((prevTrips) => prevTrips.filter((t) => t.id !== id));
                fetchAllRecommendedTrips();
              }}
            />
          ))
        )}
      </div>

      {!loading && trips.length > 0 && mode !== "favorites" && (
        <div className="pagination-modern">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`page-btn ${page === i + 1 ? "active" : ""}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
