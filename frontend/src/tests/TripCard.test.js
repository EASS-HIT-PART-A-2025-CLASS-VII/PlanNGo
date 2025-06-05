import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TripCard from "../components/TripCard";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("../services/api", () => ({
  deleteTrip: jest.fn(),
  toggleFavoriteTrip: jest.fn(),
  isTripFavorite: jest.fn(),
  updateTrip: jest.fn(),
  sendTripSummary: jest.fn(),
  calculateTripBudget: jest.fn(),
  getTripShareLink: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (msg.includes('Warning: An update to') && msg.includes('not wrapped in act')) return;
    console.warn(msg);
  });

  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg.includes('React Router Future Flag Warning')) return;
    console.log(msg);
  });
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});

const defaultProps = {
  trip: {
    id: 1,
    title: "Test Trip",
    destination: "Paris",
    description: "A fun trip",
    duration_days: 5,
    start_date: "2025-07-01",
    end_date: "2025-07-05",
    image_url: "image.jpg",
    rating: 4.5,
  },
  onDeleted: jest.fn(),
  onUnfavorited: jest.fn(),
  onUpdated: jest.fn(),
};

beforeEach(() => {
  api.isTripFavorite.mockResolvedValue({ data: { is_favorite: false } });
  jest.clearAllMocks();
  window.alert = jest.fn();
  window.confirm = jest.fn(() => true); 
  useAuth.mockReturnValue({ user: { is_admin: false } });
});

// בדיקה שהרכיב מציג את פרטי הטיול כראוי
test("renders trip details", () => {
  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );
  expect(screen.getByText("Test Trip")).toBeInTheDocument();
  expect(screen.getByText("Paris")).toBeInTheDocument();
  expect(screen.getByText("A fun trip")).toBeInTheDocument();
  expect(screen.getByText(/5 days/)).toBeInTheDocument();
});

// בדיקה שמעבר לדף פרטי טיול מתרחש בלחיצה
test("navigates to trip details on click", () => {
  const mockNavigate = jest.fn();
  require("react-router-dom").useNavigate.mockReturnValue(mockNavigate);

  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText("Test Trip"));
  expect(mockNavigate).toHaveBeenCalledWith("/trips/1");
});

// onDeleted בדיקה שכפתור מחיקה מפעיל את 
test("calls onDeleted when trip is deleted", async () => {
  api.deleteTrip.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
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

//  בדיקה להסרת טיול מהמועדפים
test("calls onUnfavorited when trip is unfavorited", async () => {
  api.isTripFavorite.mockResolvedValueOnce({ data: { is_favorite: true } });
  api.toggleFavoriteTrip.mockResolvedValueOnce({});

  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByTitle("Favorite")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByTitle("Favorite"));

  await waitFor(() => {
    expect(api.toggleFavoriteTrip).toHaveBeenCalledWith(1);
  });
  await waitFor(() => {
    expect(defaultProps.onUnfavorited).toHaveBeenCalledWith(1);
  });
});

// בדיקה שמעבר לעריכה פותח את שדות הטופס
test("enters edit mode on edit button click", () => {
  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByTitle("Edit Trip"));
  expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Destination")).toBeInTheDocument();
});

// בדיקה ששמירת עריכה מעדכנת את הטיול
test("calls onUpdated when trip is edited and saved", async () => {
  const updatedTrip = { ...defaultProps.trip, title: "Updated Trip" };
  api.updateTrip.mockResolvedValueOnce(updatedTrip);

  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
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

// בדיקה שמודאל התקציב מוצג ומחשב תקציב
test("shows budget modal and calculates budget", async () => {
  api.calculateTripBudget.mockResolvedValueOnce({ data: { estimated_budget: 1000 } });

  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText(/Budget/));
  fireEvent.change(screen.getByPlaceholderText("Enter number..."), { target: { value: "2" } });
  fireEvent.click(screen.getByText("Calculate"));

  await waitFor(() => {
    expect(api.calculateTripBudget).toHaveBeenCalledWith(1, 2);
  });
  expect(screen.getByText("1000 $")).toBeInTheDocument();
});

// בדיקה ששליחת סיכום מפעילה את הפונקציה המתאימה
test("calls sendTripSummary when summary button is clicked", async () => {
  api.sendTripSummary.mockResolvedValueOnce({});

  render(
    <MemoryRouter>
      <TripCard {...defaultProps} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText(/Summary/));

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Trip summary sent to your email.");
  });
});
