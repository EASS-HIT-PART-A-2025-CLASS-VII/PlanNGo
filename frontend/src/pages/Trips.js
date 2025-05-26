import { useEffect, useState } from "react";
import {
  getMyTrips,
  searchTrips,
  getFavoriteTrips,
  getTripsByUser,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import TripCard from "../components/TripCard";
import { FaSearch, FaRegHeart , FaHeart, FaPlus, FaSlidersH } from "react-icons/fa";
import "../css/RecommendedTrips.css";
import "../css/TripCard.css";
import "../css/SortDropdown.css";
import "../css/Pagination.css";

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
  const [creatingInlineTrip, setCreatingInlineTrip] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get("user_id");

  const isViewingOtherUser = user?.is_admin && userId;

  useEffect(() => {
    if (creatingInlineTrip) return;

    const delaySearch = setTimeout(async () => {
      setLoading(true);
      try {
        if (isViewingOtherUser) {
          const res = await getTripsByUser(userId);
          setTrips(res);
          setTotal(res.length);
          return;
        }

        if (!searchQuery.trim()) {
          const res = await getMyTrips({ page, sortBy });
          setTrips(res.data.trips);
          setTotal(res.data.total);
          setMode("all");
        } else {
          const res = await searchTrips({ query: searchQuery, page, sortBy });
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
  }, [searchQuery, page, sortBy, creatingInlineTrip, userId]);

  const handleFavoritesToggle = async () => {
    if (mode === "favorites") {
      try {
        setLoading(true);
        setMode("all");
        setSearchQuery("");
        setPage(1);
        const res = await getMyTrips({ page: 1, sortBy });
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
        }finally {
          setLoading(false);
        }
    } else {
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
      created_at: null,
    };

    setCreatingInlineTrip(true);
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

  const totalPages = Math.ceil(total / 10);

  const fetchAllMyTrips = async () => {
    try {
      setLoading(true);
      const res = await getMyTrips({ page, sortBy });

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
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {!isViewingOtherUser && user && (
            <>
              <button
                onClick={handleFavoritesToggle}
                className="icon-button"
                title={mode === "favorites" ?  "All trips" : "Favorites"}
              >
                {mode === "favorites" ? <FaHeart /> : <FaRegHeart />}
              </button>

              <button onClick={handleInlineCreate} className="icon-button" title="Create new trip">
                <FaPlus />
              </button>
            </>
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
            <TripCard
              key={trip.id}
              trip={trip}
              onUnfavorited={mode === "favorites" ? handleUnfavorited : null}
              onUpdated={(oldId, updatedTrip) => {
                setTrips((prevTrips) => [updatedTrip, ...prevTrips.filter((t) => t.id !== oldId)]);
                setCreatingInlineTrip(false);
              }}
              onDeleted={(id) => {
                setTrips((prevTrips) => prevTrips.filter((t) => t.id !== id));
                fetchAllMyTrips();
              }}
            />
          ))
        )}
      </div>

      {!loading && trips.length > 0 && mode !== "favorites" && !isViewingOtherUser && (
        <div className="pagination-modern">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const current = i + 1;
            const isFirst = current === 1;
            const isLast = current === totalPages;
            const isNearCurrent = Math.abs(current - page) <= 1;

            if (isFirst || isLast || isNearCurrent) {
              return (
                <button
                  key={current}
                  className={`page-btn ${page === current ? "active" : ""}`}
                  onClick={() => setPage(current)}
                >
                  {current}
                </button>
              );
            } else if (
              (current === 2 && page > 4) ||
              (current === totalPages - 1 && page < totalPages - 3) ||
              (current === page - 2 || current === page + 2)
            ) {
              return <span key={`dots-${current}`} className="page-dots">...</span>;
            } else {
              return null;
            }
          })}

          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}