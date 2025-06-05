import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '../pages/ResetPassword';
import { resetPassword } from '../services/api';

jest.mock('../services/api', () => ({
  resetPassword: jest.fn(),
}));

const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      args[0]?.includes("React Router Future Flag Warning") ||
      args[0]?.includes("Relative route resolution")
    ) return;
    originalWarn(...args);
  };
});
afterAll(() => {
  console.warn = originalWarn;
});

// בודק שהקומפוננטה נטענת עם כותרת ושני שדות סיסמה
test("renders reset password form", () => {
  render(
    <MemoryRouter initialEntries={["/reset/token123"]}>
      <Routes>
        <Route path="/reset/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
});

// בודק הצגת שגיאה אם הסיסמאות לא תואמות
test("shows error if passwords do not match", () => {
  render(
    <MemoryRouter initialEntries={["/reset/token123"]}>
      <Routes>
        <Route path="/reset/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText("New Password"), {
    target: { value: "abc123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
    target: { value: "xyz456" },
  });
  fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

  expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
});

// בודק שליחה תקינה והצגת הודעת הצלחה
test("submits form successfully and shows success message", async () => {
  resetPassword.mockResolvedValueOnce();

  render(
    <MemoryRouter initialEntries={["/reset/token123"]}>
      <Routes>
        <Route path="/reset/:token" element={<ResetPassword />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText("New Password"), {
    target: { value: "abc123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
    target: { value: "abc123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

  expect(resetPassword).toHaveBeenCalledWith("token123", "abc123", "abc123");

  expect(await screen.findByText("Password reset successful! Redirecting to login...")).toBeInTheDocument();
});

// בודק כשלון  
test("shows error message on API failure", async () => {
  resetPassword.mockRejectedValueOnce(new Error("Failed"));

  render(
    <MemoryRouter initialEntries={["/reset/token123"]}>
      <Routes>
        <Route path="/reset/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText("New Password"), {
    target: { value: "abc123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
    target: { value: "abc123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

  await waitFor(() => {
    expect(screen.getByText("Failed to reset password. Try again.")).toBeInTheDocument()
  });
});
