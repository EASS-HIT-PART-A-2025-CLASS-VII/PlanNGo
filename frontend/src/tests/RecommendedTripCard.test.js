import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecommendedTripCard from "../components/RecommendedTripCard";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

// מוקים לפונקציות API
jest.mock("../services/api", () => ({
  getRecommendedShareLink: jest.fn(),
  calculateTripBudget: jest.fn(),
  sendRecommendedTripSummary: jest.fn(),
  rateTrip: jest.fn(),
  cloneRecommendedTrip: jest.fn(),
  toggleFavoriteRecommended: jest.fn(),
  isRecommendedFavorite: jest.fn(),
  updateRecommendedTrip: jest.fn(),
  deleteRecommendedTrip: jest.fn(),
  createRecommendedTrip: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) return;
  });
});

afterAll(() => {
  console.warn.mockRestore();
});

// פרופס ברירת מחדל לבדיקה
const defaultProps = {
  trip: {
    id: 1,
    title: "Recommended Trip",
    destination: "Rome",
    description: "A great trip",
    duration_days: 4,
    image_url: "image.jpg",
    is_recommended: true,
    average_rating: 4.2,
  },
  onDeleted: jest.fn(),
  onUnfavorited: jest.fn(),
  onUpdated: jest.fn(),
};

// ריסט לפני כל בדיקה
beforeEach(() => {
  api.isRecommendedFavorite.mockResolvedValue({ data: { is_favorite: false } });
  jest.clearAllMocks();
  window.alert = jest.fn();
  window.confirm = jest.fn(() => true);
  useAuth.mockReturnValue({ user: { is_admin: false } });
});

// בדיקה שהכרטיס מציג את פרטי הטיול המומלץ
test("renders recommended trip details", () => {
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  expect(screen.getByText("Recommended Trip")).toBeInTheDocument();
  expect(screen.getByText("Rome")).toBeInTheDocument();
  expect(screen.getByText("A great trip")).toBeInTheDocument();
  expect(screen.getByText(/4 days/)).toBeInTheDocument();
});

// onDeleted בדיקה שמחיקת טיול ע"י אדמין מפעילה את 
test("calls onDeleted when trip is deleted", async () => {
  useAuth.mockReturnValue({ user: { is_admin: true } });
  api.deleteRecommendedTrip.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTitle("Delete Trip"));
  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Trip deleted successfully.");
  });
  await waitFor(() => {
    expect(defaultProps.onDeleted).toHaveBeenCalledWith(1);
  });
});

// בדיקה שאם טיול היה במועדפים, לחיצה על לב מסירה אותו
test("calls onUnfavorited when trip is unfavorited", async () => {
  api.isRecommendedFavorite.mockResolvedValueOnce({ data: { is_favorite: true } });
  api.toggleFavoriteRecommended.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  await waitFor(() => {
    expect(screen.getByTitle("Favorite")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTitle("Favorite"));
  await waitFor(() => {
    expect(api.toggleFavoriteRecommended).toHaveBeenCalledWith(1);
  });
  await waitFor(() => {
    expect(defaultProps.onUnfavorited).toHaveBeenCalledWith(1);
  });
});

// בדיקה שלחיצה על עריכה תציג את שדות העריכה (רק לאדמין)
test("enters edit mode on edit button click (admin)", () => {
  useAuth.mockReturnValue({ user: { is_admin: true } });
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTitle("Edit Trip"));
  expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Destination")).toBeInTheDocument();
});

// בדיקה של שמירת עריכה תפעיל onUpdated (רק לאדמין)
test("calls onUpdated when trip is edited and saved (admin)", async () => {
  useAuth.mockReturnValue({ user: { is_admin: true } });
  const updatedTrip = { ...defaultProps.trip, title: "Updated Trip" };
  api.updateRecommendedTrip.mockResolvedValueOnce(updatedTrip);
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTitle("Edit Trip"));
  const input = screen.getByPlaceholderText("Title");
  fireEvent.change(input, { target: { value: "Updated Trip" } });
  fireEvent.click(screen.getByTitle("Save"));
  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Trip updated successfully.");
  });
  await waitFor(() => {
    expect(defaultProps.onUpdated).toHaveBeenCalledWith(1, updatedTrip);
  });
});

// בדיקה של חישוב תקציב בטיול מומלץ דרך המודאל
test("shows budget modal and calculates budget", async () => {
  api.calculateTripBudget.mockResolvedValueOnce({ data: { estimated_budget: 1500 } });
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText(/Budget/));
  fireEvent.change(screen.getByPlaceholderText("Enter number..."), { target: { value: "3" } });
  fireEvent.click(screen.getByText("Calculate"));
  await waitFor(() => {
    expect(api.calculateTripBudget).toHaveBeenCalledWith(1, 3);
  });
  expect(screen.getByText("1500 $")).toBeInTheDocument();
});

// בדיקה שליחת תקציר טיול במייל
test("calls sendRecommendedTripSummary when summary button is clicked", async () => {
  api.sendRecommendedTripSummary.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText(/Summary/));
  fireEvent.change(screen.getByPlaceholderText("Enter email..."), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByText("Send"));
  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Trip summary sent successfully");
  });
});

// בדיקה של דירוג טיול מומלץ
test("calls rateTrip when submitting a rating", async () => {
  api.rateTrip.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <RecommendedTripCard {...defaultProps} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText("Rate the trip"));
  fireEvent.change(screen.getByPlaceholderText("1 to 5"), { target: { value: "5" } });
  fireEvent.click(screen.getByText("Submit Rating"));
  await waitFor(() => {
    expect(api.rateTrip).toHaveBeenCalledWith(1, 5);
  });
});
