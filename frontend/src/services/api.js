// Backend שליפת כל הנתיבים מה

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  });
  
// מוסיף טוקן אוטומטי אם קיים
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== AUTH =====
export const signup = ({ username, email, password, confirm_password, profile_image_url }) =>
  api.post("/auth/signup", { username, email, password, confirm_password, profile_image_url });
export const login = (email, password) =>
  api.post("/auth/login", { email, password });
export const getProfile = () => api.get("/auth/me");
export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });
export const resetPassword = (token, new_password, confirm_new_password) => 
  api.post("/auth/reset-password", { token, new_password, confirm_new_password });
export const updateUserProfile = (data) => 
  api.put("/auth/profile", data);

// ===== ADMIN =====
export const getAllUsers = () => api.get("/admin/users");
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);
export const createRecommendedTrip = (data) =>
  api.post("/admin/recommended", data);
export const updateRecommendedTrip = (tripId, data) =>
  api.put(`/admin/recommended/${tripId}`, data).then((res) => res.data);
export const deleteRecommendedTrip = (tripId) =>
  api.delete(`/admin/recommended/${tripId}`);
export const convertToRecommended = (tripId) =>
  api.post(`/admin/recommended/convert/${tripId}`);
export const getTripsByUser = (userId) =>
  api.get(`/admin/users/${userId}/trips`).then((res) => res.data);

// ===== RECOMMENDED =====
export const getRecommendedTrips = ({ page = 1, sortBy = "recent" }) =>
  api.get(`/recommended/?page=${page}&sort_by=${sortBy}`);
export const searchRecommendedTrips = ({ query, page = 1, sortBy = "recent" }) => {
  const encoded = encodeURIComponent(query);
  return api.get(
    `/recommended/search?title=${encoded}&description=${encoded}&destination=${encoded}&creator_name=${encoded}&page=${page}&sort_by=${sortBy}`
  );
};
export const getTopRatedRecommended = () => api.get("/recommended/top-rated");
export const rateTrip = (tripId, rating) =>
  api.post(`/recommended/${tripId}/rate`, { rating });
export const addComment = (tripId, comment) =>
  api.post(`/recommended/${tripId}/comments`, { content: comment });
export const getComments = (tripId) =>
  api.get(`/recommended/${tripId}/comments`);
export const deleteComment = (commentId) =>
  api.delete(`/recommended/comments/${commentId}`);
export const getRecommendedShareLink = (tripId) =>
  api.get(`/recommended/${tripId}/shared-link`);
export const getSharedRecommendedTrip = (uuid) =>
  api.get(`/recommended/shared-recommended-trip/${uuid}`);

// ===== TRIPS =====
export const getMyTrips = ({ page = 1, sortBy = "recent" }) =>
  api.get(`/trips/?page=${page}&sort_by=${sortBy}`);
export const searchTrips = ({ query, page = 1, sortBy = "recent" }) => {
  const encoded = encodeURIComponent(query);
  return api.get(
    `/trips/search?title=${encoded}&description=${encoded}&destination=${encoded}&creator_name=${encoded}&page=${page}&sort_by=${sortBy}`
  );
};
export const getTripById = (tripId) => api.get(`/trips/${tripId}`);
export const createTrip = (tripData) => api.post("/trips/", tripData);
export const updateTrip = (tripId, data) =>
  api.put(`/trips/${tripId}`, data).then((res) => res.data);
export const deleteTrip = (tripId) => api.delete(`/trips/${tripId}`);
export const cloneRecommendedTrip = (tripId) =>
  api.post(`/trips/${tripId}/clone`);
export const getTripShareLink = (tripId) =>
  api.get(`/trips/${tripId}/shared-link`);
export const getSharedTrip = (uuid) =>
  api.get(`/trips/shared-trip/${uuid}`);
export const cloneAiTrip = (tripData) =>
  api.post("/trips/clone-ai-trip", tripData);

// ===== ACTIVITIES =====
export const getActivities = (tripId) =>
  api.get(`/trips/${tripId}/activities`);
export const getActivitiesByDay = (tripId, dayNumber) =>
  api.get(`/trips/${tripId}/activities/day/${dayNumber}`);
export const createActivity = (tripId, activity) =>
  api.post(`/trips/${tripId}/activities`, activity);
export const updateActivity = (activityId, activity) =>
  api.put(`/trips/activities/${activityId}`, activity);
export const deleteActivity = (activityId) =>
  api.delete(`/trips/activities/${activityId}`);

// ===== FAVORITES =====
export const getFavoriteTrips = () => api.get("/favorites/trips");
export const toggleFavoriteTrip = (tripId) =>
  api.post(`/favorites/trips/${tripId}`);
export const isTripFavorite = (tripId) =>
  api.get(`/favorites/trips/${tripId}/is-favorite`);
export const getFavoriteRecommended = () =>
  api.get("/favorites/recommended");
export const toggleFavoriteRecommended = (tripId) =>
  api.post(`/favorites/recommended/${tripId}`);
export const isRecommendedFavorite = (tripId) =>
  api.get(`/favorites/recommended/${tripId}/is-favorite`);

// ===== EMAIL =====
export const sendTripSummary = (tripId) =>
  api.get(`/emails/send-trip-summary/${tripId}`);
export const sendRecommendedTripSummary = (tripId, email) =>
  api.post(`/emails/send-recommended-summary/${tripId}`, { email });
export const sendAiTripSummary = (tripData) =>
  api.post("/emails/send-ai-summary", tripData);

// ===== AI SERVICE =====
export const generateCustomTrip = (data) =>
  api.post("/ai/custom-trip", data);
export const calculateTripBudget = (tripId, num_travelers) =>
  api.post(`/ai/calculate-budget/${tripId}?num_travelers=${num_travelers}`);
export const getTripTypes = () => api.get("/ai/trip-types");

export default api;