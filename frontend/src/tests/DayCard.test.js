import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DayCard from "../components/DayCard";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

jest.mock("../services/api");
jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

describe("DayCard component", () => {
  const mockUser = { is_admin: false };
  const defaultProps = {
    index: 0,
    tripId: 123,
    activities: null,
    canEdit: true,
  };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((msg) => {
      if (!msg.toString().includes('not wrapped in act')) {
        console.error(msg);
      }
    });
  });

  beforeEach(() => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getActivitiesByDay.mockResolvedValue({ data: [] });
    jest.clearAllMocks();
  });

  // מציג את כותרת היום (Day 1)
  test("displays the title of the day", async () => {
    render(<DayCard {...defaultProps} />);
    expect(screen.getByText("Day 1")).toBeInTheDocument();
  });

  // props טוען פעילויות מהשרת אם לא נשלחו 
  test("fetches activities from the server if not provided via props", async () => {
    const mockActivities = [
      { id: 1, time: "08:00", title: "Visit museum", description: "", location_name: "City Center" },
    ];
    api.getActivitiesByDay.mockResolvedValue({ data: mockActivities });

    render(<DayCard {...defaultProps} />);

    expect(api.getActivitiesByDay).toHaveBeenCalledWith(123, 1);
    await waitFor(() => {
      expect(screen.getByText("Visit museum")).toBeInTheDocument();
    });
  });

  // props טוען פעילויות מהשרת שנשלחו אם נשלחו
  test("displays activities provided via props", () => {
    const propsWithActivities = {
      ...defaultProps,
      activities: [
        {
          id: 5,
          time: "09:00",
          title: "Prop Activity",
          description: "Pre-loaded",
          location_name: "Beach",
        },
      ],
    };

    render(<DayCard {...propsWithActivities} />);
    expect(screen.getByText("Prop Activity")).toBeInTheDocument();
    expect(screen.getByText("Beach")).toBeInTheDocument();
  });

  // מוסיף פעילות חדשה
  test("adds a new activity", async () => {
    render(<DayCard {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Add Activity"));

    fireEvent.change(screen.getByPlaceholderText("* Title"), {
      target: { value: "New Activity" },
    });
    fireEvent.change(screen.getByPlaceholderText("* Location"), {
      target: { value: "Park" },
    });

    const newActivity = {
      id: 999,
      time: "10:00",
      title: "New Activity",
      description: "",
      location_name: "Park",
    };
    api.createActivity.mockResolvedValue({ data: newActivity });

    fireEvent.click(screen.getByTitle("Add"));

    await waitFor(() => {
      expect(screen.getByText("New Activity")).toBeInTheDocument();
    });
  });


  // עורך פעילות קיימת
  test("edits an existing activity", async () => {
    const mockActivities = [
      { id: 1, time: "08:00", title: "Visit museum", description: "", location_name: "City Center" },
    ];
    api.getActivitiesByDay.mockResolvedValue({ data: mockActivities });
    api.updateActivity.mockResolvedValue();

    render(<DayCard {...defaultProps} />);

    await screen.findByText("Visit museum");

    fireEvent.click(screen.getByLabelText("Edit Activity"));
    fireEvent.change(screen.getByDisplayValue("Visit museum"), {
      target: { value: "Art Gallery" },
    });

    fireEvent.click(screen.getByTitle("Save"));

    await waitFor(() => {
      expect(screen.getByText("Art Gallery")).toBeInTheDocument();
    });
  });


  // מוחק פעילות קיימת
  test("deletes an existing activity", async () => {
    window.confirm = jest.fn(() => true);

    const mockActivities = [
      { id: 1, time: "08:00", title: "Visit museum", description: "", location_name: "City Center" },
    ];
    api.getActivitiesByDay.mockResolvedValue({ data: mockActivities });
    api.deleteActivity.mockResolvedValue();

    render(<DayCard {...defaultProps} />);

    await screen.findByText("Visit museum");

    fireEvent.click(screen.getByLabelText("Delete Activity"));

    await waitFor(() => {
      expect(screen.queryByText("Visit museum")).not.toBeInTheDocument();
    });
  });
});
