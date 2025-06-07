import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function UserLayout() {
  const { user } = useAuth();

  return (
    <>
      <Navbar key={user?.username} role="user" />
      <main><Outlet /></main>
    </>
  );
}
