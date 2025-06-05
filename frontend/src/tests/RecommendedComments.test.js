import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecommendedComments from "../components/RecommendedComments";
import * as api from "../services/api";

jest.mock("../services/api");

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();

  api.getComments.mockResolvedValue({
    data: [
      {
        id: 1,
        user_name: "Lian",
        content: "Great trip!",
        created_at: new Date().toISOString(),
      },
    ],
  });

  api.addComment.mockResolvedValue({});
  api.deleteComment.mockResolvedValue({});
});

// הוספת תגובה
test("adds a comment", async () => {
  render(
    <RecommendedComments
      tripId={123}
      user={{ username: "Lian", is_admin: true }}
      onClose={() => {}}
    />
  );

  const input = await screen.findByPlaceholderText("Write a comment...");
  fireEvent.change(input, { target: { value: "Nice!" } });
  fireEvent.click(screen.getByTitle("Add comment"));

  await waitFor(() => {
    expect(api.addComment).toHaveBeenCalledWith(123, "Nice!");
  });
});

// tripId הצגת תגובות לפי 
test("loads and displays comments for tripId", async () => {
  render(
    <RecommendedComments
      tripId={123}
      user={{ username: "Lian", is_admin: true }}
      onClose={() => {}}
    />
  );

  const comment = await screen.findByText((_, node) =>
    node?.textContent === "Great trip!"
  );

  expect(comment).toBeInTheDocument();
});

// מחיקת תגובה
test("deletes a comment if user is owner", async () => {
  render(
    <RecommendedComments
      tripId={123}
      user={{ username: "Lian", is_admin: true }}
      onClose={() => {}}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Great trip!")).toBeInTheDocument();
  });

  const deleteBtn = screen.getByLabelText("Delete comment 1");
  expect(deleteBtn).toBeInTheDocument();

  fireEvent.click(deleteBtn);

  await waitFor(() => {
    expect(api.deleteComment).toHaveBeenCalledWith(1);
  });
});
