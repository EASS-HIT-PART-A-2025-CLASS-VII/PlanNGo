import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordRequest from '../pages/ForgotPasswordRequest';
import { forgotPassword } from '../services/api';

jest.mock('../services/api', () => ({
  forgotPassword: jest.fn(),
}));

const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      args[0]?.includes("React Router Future Flag Warning") ||
      args[0]?.includes("React Router will begin wrapping state updates") ||
      args[0]?.includes("Relative route resolution within Splat routes")
    ) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// בודק שהקומפוננטה מציגה את הכותרת והכפתור
test("renders the forgot password form", () => {
  render(
    <MemoryRouter>
      <ForgotPasswordRequest />
    </MemoryRouter>
  );
  expect(screen.getByText("Forgot Your Password?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
});

// בודק שהודעת הצלחה מוצגת לאחר שליחה תקינה
test("displays success message on valid submission", async () => {
  forgotPassword.mockResolvedValueOnce();

  render(
    <MemoryRouter>
      <ForgotPasswordRequest />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
    target: { value: "test@example.com" },
  });

  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

  await waitFor(() => {
    expect(forgotPassword).toHaveBeenCalledWith("test@example.com");
  });

  expect(await screen.findByText("A reset link was sent to your email.")).toBeInTheDocument();
});

// בודק טיפול בשגיאה
test("displays error message on API failure", async () => {
  forgotPassword.mockRejectedValueOnce(new Error("API error"));

  render(
    <MemoryRouter>
      <ForgotPasswordRequest />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
    target: { value: "fail@example.com" },
  });

  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

  await waitFor(() => {
    expect(forgotPassword).toHaveBeenCalledWith("fail@example.com");
  });

  expect(
    await screen.findByText("Failed to send reset link. Please try again.")
  ).toBeInTheDocument();
});
