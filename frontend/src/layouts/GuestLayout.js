import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function GuestLayout() {
  return (
    <>
      <Navbar role="guest" />
      <main><Outlet /></main>
    </>
  );
}
