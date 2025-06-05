import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Trips from '../pages/Trips';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

jest.mock('../services/api', () => ({
  getMyTrips: jest.fn(),
  searchTrips: jest.fn(),
  getFavoriteTrips: jest.fn(),
  isTripFavorite: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('Trips', () => {
  const originalWarn = console.warn;

  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation((msg) => {
      if (
        msg.includes('React Router Future Flag Warning') ||
        msg.includes('Relative route resolution within Splat routes')
      ) return;
      originalWarn(msg);
    });
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  // בדיקה: טוען את הטיולים האישיים כברירת מחדל
  test('renders my trips', async () => {
    api.getMyTrips.mockResolvedValueOnce({ data: { trips: [{ id: 1, title: 'Local Trip' }], total: 1 } });
    api.isTripFavorite.mockResolvedValue({ data: { is_favorite: false } });
    useAuth.mockReturnValue({ user: { id: 123, is_admin: false } });

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/search trips/i)).toBeInTheDocument();
    expect(await screen.findByText('Local Trip')).toBeInTheDocument();
  });

  // בדיקה: מחפש טיול לפי מחרוזת חיפוש
  test('searches my trips on input', async () => {
    api.getMyTrips.mockResolvedValueOnce({ data: { trips: [], total: 0 } });
    api.searchTrips.mockResolvedValueOnce({ data: { trips: [{ id: 2, title: 'Beach Vacation' }], total: 1 } });
    api.isTripFavorite.mockResolvedValue({ data: { is_favorite: false } });
    useAuth.mockReturnValue({ user: { id: 123, is_admin: false } });

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/search trips/i), {
      target: { value: 'Beach' },
    });

    await waitFor(() => {
      expect(screen.getByText('Beach Vacation')).toBeInTheDocument();
    });
  });

  // בדיקה: טוען את רשימת הטיולים שנשמרו כמועדפים
  test('loads favorite trips when toggled', async () => {
    api.getMyTrips.mockResolvedValueOnce({ data: { trips: [], total: 0 } });
    api.getFavoriteTrips.mockResolvedValueOnce({ data: [{ id: 3, title: 'Favorite Local Trip' }] });
    api.isTripFavorite.mockResolvedValue({ data: { is_favorite: true } });
    useAuth.mockReturnValue({ user: { id: 123, is_admin: false } });

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>
    );

    const favButton = screen.getByTitle(/favorites/i);
    fireEvent.click(favButton);

    await waitFor(() => {
      expect(screen.getByText('Favorite Local Trip')).toBeInTheDocument();
    });
  });

  // בדיקה: חזרה ממצב מועדפים לרשימת הטיולים המלאה
  test('toggles from favorites back to all trips', async () => {
    api.getFavoriteTrips.mockResolvedValueOnce({ data: [{ id: 3, title: 'Favorite Local Trip' }] });
    api.getMyTrips
      .mockResolvedValueOnce({ data: { trips: [], total: 0 } })
      .mockResolvedValueOnce({ data: { trips: [{ id: 4, title: 'Regular Trip' }], total: 1 } });

    api.isTripFavorite.mockResolvedValue({ data: { is_favorite: false } });
    useAuth.mockReturnValue({ user: { id: 123, is_admin: false } });

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>
    );

    const favButton = screen.getByTitle(/favorites/i);
    fireEvent.click(favButton);

    expect(await screen.findByText('Favorite Local Trip')).toBeInTheDocument();

    fireEvent.click(favButton);

    expect(await screen.findByText('Regular Trip')).toBeInTheDocument();
  });

  // בדיקה: שגיאה בייבוא טיולים מובילה לשגיאה
  test('shows alert on fetch error', async () => {
    api.getMyTrips.mockRejectedValueOnce({ response: { data: { detail: 'fetch failed' } } });
    useAuth.mockReturnValue({ user: { id: 123, is_admin: false } });

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('fetch failed');
    });
  });
});
