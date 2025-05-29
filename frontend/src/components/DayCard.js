import { useEffect, useState } from "react";
import {
  getActivitiesByDay,
  deleteActivity,
  updateActivity,
  createActivity,
} from "../services/api";
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "../css/DayCard.css";

export default function DayCard({ index, tripId, activities: propActivities, canEdit = false }) {
  const [activities, setActivities] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newActivity, setNewActivity] = useState({
    time: "",
    title: "",
    description: "",
    location_name: "",
  });
  const useProp = !!propActivities;
  const { user } = useAuth();

  const sortByTime = (arr) => {
    return [...arr].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  };

  useEffect(() => {
    if (useProp) {
      setActivities(sortByTime(propActivities));
      return;
    }

    const fetchActivities = async () => {
      try {
        const res = await getActivitiesByDay(tripId, index + 1);
        setActivities(sortByTime(res.data));
      } catch (err) {
        console.error("Failed to fetch activities for day", index + 1, err);
      }
    };

    fetchActivities();
  }, [tripId, index, useProp, propActivities]);

  const startEdit = (activity) => {
    setEditingId(activity.id);
    setEditForm({
      time: activity.time?.slice(0, 5) || "",
      title: activity.title || "",
      description: activity.description || "",
      location_name: activity.location_name || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (activityId) => {
    if (!editForm.title.trim() || !editForm.location_name.trim()) {
      alert("Title and Location are required.");
      return;
    }

    try {
      await updateActivity(activityId, {
        ...editForm,
        day_number: index + 1,
      });
      const updatedList = activities.map((act) =>
        act.id === activityId ? { ...act, ...editForm } : act
      );
      setActivities(sortByTime(updatedList));
      setEditingId(null);
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

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      await deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
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

  const handleAddActivity = () => {
    setIsAdding(true);
    setNewActivity({ time: "", title: "", description: "", location_name: "" });
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewActivity({ time: "", title: "", description: "", location_name: "" });
  };

  const saveNewActivity = async () => {
    if (!newActivity.title.trim() || !newActivity.location_name.trim()) {
      alert("Title and Location are required.");
      return;
    }

    try {
      const res = await createActivity(tripId, {
        ...newActivity,
        day_number: index + 1,
      });
      setActivities(sortByTime([...activities, res.data]));
      setIsAdding(false);
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

  const canUserEdit = canEdit || (user?.is_admin && propActivities?.[0]?.is_recommended);

  return (
    <div className="day-card">
      <div className="day-card-header">
        <h3 className="day-title">Day {index + 1}</h3>
        {canUserEdit && (
          <button className="day-add-btn" onClick={handleAddActivity}>
            <FaPlus />
          </button>
        )}
      </div>

      <ul className="activity-list">
        {isAdding && canUserEdit && (
          <li className="activity-row">
            <input
              type="time"
              className="activity-input"
              value={newActivity.time}
              onChange={(e) => setNewActivity((prev) => ({ ...prev, time: e.target.value }))}
            />
            <input
              className="activity-input"
              placeholder="* Title"
              value={newActivity.title}
              onChange={(e) => setNewActivity((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className="activity-input"
              placeholder="Description (optional)"
              value={newActivity.description}
              onChange={(e) => setNewActivity((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              className="activity-input"
              placeholder="* Location"
              value={newActivity.location_name}
              onChange={(e) => setNewActivity((prev) => ({ ...prev, location_name: e.target.value }))}
            />
            <div className="activity-actions">
              <FaCheck className="activity-btn" onClick={saveNewActivity} title="Add" />
              <FaTimes className="activity-btn" onClick={cancelAdd} title="Cancel" />
            </div>
          </li>
        )}

        {activities.length === 0 ? (
          <p className="no-activities">No activities</p>
        ) : (
          activities.map((act, i) => (
            <li key={act.id || i} className="activity-row">
              {editingId === act.id ? (
                <>
                  <input
                    type="time"
                    className="activity-input"
                    value={editForm.time}
                    onChange={(e) => handleEditChange("time", e.target.value)}
                  />
                  <input
                    className="activity-input"
                    value={editForm.title}
                    onChange={(e) => handleEditChange("title", e.target.value)}
                    placeholder="* Title"
                  />
                  <input
                    className="activity-input"
                    value={editForm.description}
                    onChange={(e) => handleEditChange("description", e.target.value)}
                    placeholder="Description"
                  />
                  <input
                    className="activity-input"
                    value={editForm.location_name}
                    onChange={(e) => handleEditChange("location_name", e.target.value)}
                    placeholder="* Location"
                  />
                  <div className="activity-actions">
                    <FaCheck className="activity-btn" onClick={() => saveEdit(act.id)} title="Save" />
                    <FaTimes className="activity-btn" onClick={cancelEdit} title="Cancel" />
                  </div>
                </>
              ) : (
                <>
                  <div className="activity-time-box">{act.time?.slice(0, 5) || "--:--"}</div>
                  <div className="activity-title">{act.title}</div>
                  <div className="activity-desc">{act.description}</div>
                  <div className="activity-location">{act.location_name}</div>
                  {canUserEdit && (
                    <div className="activity-actions">
                      <FaEdit className="activity-btn" onClick={() => startEdit(act)} title="Edit" />
                      <FaTrash className="activity-btn" onClick={() => handleDeleteActivity(act.id)} title="Delete" />
                    </div>
                  )}
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
