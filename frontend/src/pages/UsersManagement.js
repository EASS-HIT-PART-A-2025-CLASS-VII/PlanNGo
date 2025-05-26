import { useEffect, useState } from "react";
import { getAllUsers, deleteUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaSuitcase } from "react-icons/fa";
import "../css/UsersManagement.css";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
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

  const goToUserTrips = (userId) => {
    navigate(`/trips?user_id=${userId}`);
  };

  return (
    <div className="users-list">
      {loading ? (
        <p> Loading users...</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Username</th>
              <th></th> {/* עמודת אייקונים */}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.username}</td>
                <td className="actions-cell">
                  <button onClick={() => goToUserTrips(user.id)} title="View trips">
                    <FaSuitcase />
                  </button>
                  <button onClick={() => handleDelete(user.id)} title="Delete user">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
