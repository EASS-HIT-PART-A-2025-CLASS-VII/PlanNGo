import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { getComments, deleteComment, addComment } from "../services/api";
import "../css/RecommendedComments.css";

// ניהול תאריך לפי שעון ישראל
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export default function RecommendedComments({ tripId, onClose, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const isLoggedIn = !!user;

  const fetchComments = async () => {
    try {
      const res = await getComments(tripId);
      setComments(res.data);
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

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
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

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(tripId, newComment);
      setNewComment("");
      fetchComments();
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal comments-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3 className="modal-title">Comments</h3>

        {isLoggedIn && (
          <div className="comment-input-wrapper">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              className="comment-input"
            />
            <button
              className="send-comment-btn"
              onClick={handleAdd}
              title="Add comment"
            >
              ➤
            </button>
          </div>
        )}

        {loading ? (
          <p>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-header">
                  <strong>👤 {comment.user_name}</strong>
                  <span>
                    {dayjs.utc(comment.created_at) 
                      .tz("Asia/Jerusalem") 
                      .format("DD/MM/YYYY HH:mm")}
                  </span>
                  {(isLoggedIn && (user?.username === comment.user_name || user?.is_admin)) && (
                    <button
                      className="delete-comment-btn"
                      onClick={() => handleDelete(comment.id)}
                      aria-label={`Delete comment ${comment.id}`}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
                <p className="comment-content" data-testid={`comment-content-${comment.id}`}>
                  {comment.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
