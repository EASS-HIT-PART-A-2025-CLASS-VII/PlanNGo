import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Layouts
import GuestLayout from "./layouts/GuestLayout";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

// Pages - אורח
import TripDetails from "./pages/TripDetails";
import AiTripPlanner from "./pages/AiTripPlanner";
import AiTripResult from "./pages/AiTripResult";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPasswordRequest from "./pages/ForgotPasswordRequest";

// Pages - משתמש רגיל
import Profile from "./pages/Profile";
import Trips from "./pages/Trips";

// Pages - אדמין
import UsersManagement from "./pages/UsersManagement";

// כללי
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import SharedTrip from "./pages/SharedTrip";
import RecommendedTrips from "./pages/RecommendedTrips";

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/shared/recommended/:uuid" element={<SharedTrip />} />
        <Route path="/shared/trips/:uuid" element={<SharedTrip />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />

        {/* אורח */}
        {!user && (
          <Route path="/" element={<GuestLayout />}>
            <Route index element={<RecommendedTrips />} />
            <Route path="recommended" element={<RecommendedTrips />} />
            <Route path="trips/:trip_id" element={<TripDetails />} />
            <Route path="ai" element={<AiTripPlanner />} />
            <Route path="ai/trip-result" element={<AiTripResult />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPasswordRequest />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        )}

        {/* משתמש רגיל */}
        {user && !user.is_admin && (
          <Route path="/" element={<UserLayout />}>
            <Route index element={<Trips />} />
            <Route path="my-trips" element={<Trips />} />
            <Route path="recommended" element={<RecommendedTrips />} />
            <Route path="trips/:trip_id" element={<TripDetails />} />
            <Route path="ai" element={<AiTripPlanner />} />
            <Route path="ai/trip-result" element={<AiTripResult />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} /> 
          </Route>
        )}

        {/* אדמין */}
        {user?.is_admin && (
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<RecommendedTrips />} />
            <Route path="recommended" element={<RecommendedTrips />} />
            <Route path="trips/:trip_id" element={<TripDetails />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<UsersManagement />} /> 
            <Route path="trips" element={<Trips />} /> 
            <Route path="ai" element={<AiTripPlanner />} />
             <Route path="ai/trip-result" element={<AiTripResult />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        )}
        
      </Routes>
    </Router>
  );
}
