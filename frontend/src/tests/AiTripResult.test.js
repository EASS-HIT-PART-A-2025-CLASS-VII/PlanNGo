import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AiTripResult from '../pages/AiTripResult';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

jest.mock('../services/api', () => ({
  sendAiTripSummary: jest.fn(),
  cloneAiTrip: jest.fn(),
  cloneAiTripAsRecommended: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  useNavigate: () => jest.fn(),
}));

describe('AiTripResult', () => {
  const tripMock = {
    destination: 'Paris',
    days: 3,
    travelers: 2,
    trip_type: 'Romantic',
    estimated_budget: 1200,
    trip_plan: [
      { day: 1, activities: [] },
      { day: 2, activities: [] },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    useLocation.mockReturnValue({ state: tripMock });
  });

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router Future Flag Warning') ||
      msg.includes('Relative route resolution within Splat routes')
    ) return;
    console.warn(msg);
  });
});

  // בדיקה: מציג את פרטי הטיול
  test('renders trip details from location.state', () => {
    useAuth.mockReturnValue({ user: { email: 'test@example.com' } });

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    expect(screen.getByText(/Trip to: Paris/i)).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();
    expect(screen.getByText(/2 travelers/)).toBeInTheDocument();
    expect(screen.getByText(/Romantic/)).toBeInTheDocument();
    expect(screen.getByText(/\$1200/)).toBeInTheDocument();
  });

  // בדיקה: שליחת סיכום באימייל למשתמש המחובר
  test('sends summary email when user has email', async () => {
    useAuth.mockReturnValue({ user: { email: 'test@example.com' } });
    api.sendAiTripSummary.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/send trip summary/i));

    await waitFor(() => {
      expect(api.sendAiTripSummary).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        destination: 'Paris',
      }));
    });
    expect(window.alert).toHaveBeenCalledWith('Summary sent successfully!');
  });

  // בדיקה: פתיחת מודאל אם המשתמש לא מחובר
  test('shows email modal if no user email', () => {
    useAuth.mockReturnValue({ user: null });

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/send trip summary/i));
    expect(screen.getByText(/Send Summary/i)).toBeInTheDocument();
  });

  // בדיקה: מוסיף טיול למומלצים אם המשתמש הוא אדמין
  test('clones trip as recommended for admin', async () => {
    useAuth.mockReturnValue({ user: { is_admin: true } });
    api.cloneAiTripAsRecommended.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/Add to My Trips/i));

    await waitFor(() => {
      expect(api.cloneAiTripAsRecommended).toHaveBeenCalledWith(expect.objectContaining({
        destination: 'Paris',
        duration_days: 3,
      }));
    });
  });

  // בדיקה: מוסיף טיול לטיולים האישיים אם המשתמש לא אדמין
  test('clones trip to my trips for non-admin', async () => {
    useAuth.mockReturnValue({ user: { is_admin: false } });
    api.cloneAiTrip.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/Add to My Trips/i));

    await waitFor(() => {
      expect(api.cloneAiTrip).toHaveBeenCalledWith(expect.objectContaining({
        destination: 'Paris',
        duration_days: 3,
      }));
    });
  });

  // אם לא נוצר טיול תופיע שגיאה
  test('shows fallback when no trip in location.state', () => {
    useLocation.mockReturnValue({ state: null });
    useAuth.mockReturnValue({ user: null });

    render(
      <MemoryRouter>
        <AiTripResult />
      </MemoryRouter>
    );

    expect(screen.getByText(/No Trip Data Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Go Back/i)).toBeInTheDocument();
  });
});
