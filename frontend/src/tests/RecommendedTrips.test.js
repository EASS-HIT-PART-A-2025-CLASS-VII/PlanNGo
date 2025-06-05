import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecommendedTrips from '../pages/RecommendedTrips';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

jest.mock('../services/api', () => ({
  getRecommendedTrips: jest.fn(),
  searchRecommendedTrips: jest.fn(),
  getFavoriteRecommended: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('RecommendedTrips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
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

  // בדיקה שהעמוד מציג טיולים מומלצים ברירת מחדל
  test('renders recommended trips', async () => {
    api.getRecommendedTrips.mockResolvedValueOnce({
      data: { trips: [{ id: 1, title: 'Trip to Paris' }], total: 1 },
    });
    useAuth.mockReturnValue({ user: { is_admin: false } });

    render(
      <MemoryRouter>
        <RecommendedTrips />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/search trips/i)).toBeInTheDocument();
    expect(await screen.findByText('Trip to Paris')).toBeInTheDocument();
  });

  // בדיקה שהחיפוש עובד ומחזיר תוצאות נכונות
  test('searches trips on input', async () => {
    api.getRecommendedTrips.mockResolvedValueOnce({ data: { trips: [], total: 0 } }); // קריאה ראשונית ריקה
    api.searchRecommendedTrips.mockResolvedValueOnce({
      data: { trips: [{ id: 2, title: 'Rome Adventure' }], total: 1 },
    });

    useAuth.mockReturnValue({ user: { is_admin: false } });

    render(
      <MemoryRouter>
        <RecommendedTrips />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/search trips/i), {
      target: { value: 'Rome' },
    });

    await waitFor(() => {
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
    });
  });

  // בדיקה שמעבר למצב "מועדפים" מציג טיולים שמורים
  test('loads favorites when toggled', async () => {
    api.getFavoriteRecommended.mockResolvedValueOnce({
      data: [{ id: 3, title: 'Favorite Trip' }],
    });

    useAuth.mockReturnValue({ user: { is_admin: false } });

    render(
      <MemoryRouter>
        <RecommendedTrips />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/favorites/i));

    await waitFor(() => {
      expect(screen.getByText('Favorite Trip')).toBeInTheDocument();
    });
  });

  // בדיקה ששגיאה בייבוא טיולים מובילה לשגיאה
  test('shows alert on fetch error', async () => {
    api.getRecommendedTrips.mockRejectedValueOnce({
      response: { data: { detail: 'fail' } },
    });
    useAuth.mockReturnValue({ user: { is_admin: false } });

    render(
      <MemoryRouter>
        <RecommendedTrips />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('fail');
    });
  });
});
