import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { getComments, deleteComment, addComment } from "../services/api";
import "../css/RecommendedComments.css";

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
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(tripId, newComment);
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error("Add comment failed", err);
      alert("Failed to add comment");
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
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                  {isLoggedIn && user?.username === comment.user_name && (
                    <button
                      className="delete-comment-btn"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
                <p className="comment-content">{comment.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
