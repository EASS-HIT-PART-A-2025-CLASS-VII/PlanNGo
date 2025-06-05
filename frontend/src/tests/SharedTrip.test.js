import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedTrip from '../pages/SharedTrip';
import * as api from '../services/api';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../services/api', () => ({
  getSharedTrip: jest.fn(),
  getSharedRecommendedTrip: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router Future Flag Warning') ||
      msg.includes('Relative route resolution')
    ) {
      return;
    }
    console.warn(msg); 
  });
});

// בדיקה: הצגת טיול ששותף
test("redirects to regular shared trip", async () => {
  api.getSharedTrip.mockResolvedValueOnce({ data: { id: "abc123" } });

  render(
    <MemoryRouter initialEntries={["/shared/trips/uuid123"]}>
      <Routes>
        <Route path="/shared/trips/:uuid" element={<SharedTrip />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(api.getSharedTrip).toHaveBeenCalledWith("uuid123");
  });
  expect(mockNavigate).toHaveBeenCalledWith("/trips/abc123");
});

// בדיקה: הצגת טיול מומלץ ששותף
test("redirects to shared recommended trip", async () => {
  api.getSharedRecommendedTrip.mockResolvedValueOnce({ data: { id: "xyz789" } });

  render(
    <MemoryRouter initialEntries={["/shared/recommended/uuid999"]}>
      <Routes>
        <Route path="/shared/recommended/:uuid" element={<SharedTrip />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(api.getSharedRecommendedTrip).toHaveBeenCalledWith("uuid999");
  });
  expect(mockNavigate).toHaveBeenCalledWith("/trips/xyz789");
});

// בדיקה: הצגת שגיאה כאשר לא מצליח להציג טיול ששותף
test("shows alert and redirects to not-found on error", async () => {
  api.getSharedTrip.mockRejectedValueOnce({
    response: { data: { detail: "Trip not found" } },
  });

  render(
    <MemoryRouter initialEntries={["/shared/trips/badid"]}>
      <Routes>
        <Route path="/shared/trips/:uuid" element={<SharedTrip />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Trip not found");
  });
  expect(mockNavigate).toHaveBeenCalledWith("/not-found");
});
