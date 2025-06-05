import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TripDetails from '../pages/TripDetails';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

jest.mock('../services/api', () => ({
  __esModule: true,
  ...jest.requireActual('../services/api'),
  getTripById: jest.fn(),
  getActivitiesByDay: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router Future Flag Warning') ||
      msg.includes('Relative route resolution')
    ) return;
    console.warn(msg);
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

const sampleTrip = {
  id: 'trip123',
  title: 'Trip to Rome',
  destination: 'Rome',
  description: 'Exciting adventure!',
  duration_days: 2,
  start_date: '2025-08-01',
  end_date: '2025-08-03',
  is_recommended: false,
  user_id: 1,
};

const sampleUser = {
  id: 1,
  is_admin: false,
};

// בדיקה: פרטי טיול מוצגים בהצלחה
test('renders trip details correctly', async () => {
  api.getTripById.mockResolvedValueOnce({ data: sampleTrip });
  api.getActivitiesByDay.mockResolvedValue({ data: [] });
  useAuth.mockReturnValue({ user: sampleUser });

  render(
    <MemoryRouter initialEntries={['/trip/trip123']}>
      <Routes>
        <Route path="/trip/:trip_id" element={<TripDetails />} />
      </Routes>
    </MemoryRouter>
  );

  const titleElement = await screen.findByRole('heading', { name: /trip to rome/i });
  expect(titleElement).toBeInTheDocument();

  expect(screen.getAllByText(/Rome/).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/Exciting adventure!/i)).toBeInTheDocument();
  expect(screen.getByText(/2 days/i)).toBeInTheDocument();
});

// בדיקה: שגיאה בעת שליפת הטיול
test('alerts on fetch error', async () => {
  api.getTripById.mockRejectedValueOnce({
    response: { data: { detail: 'Trip not found' } },
  });
  useAuth.mockReturnValue({ user: sampleUser });

  render(
    <MemoryRouter initialEntries={['/trip/badid']}>
      <Routes>
        <Route path="/trip/:trip_id" element={<TripDetails />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Trip not found');
  });

  expect(screen.getByText(/Trip not found/i)).toBeInTheDocument();
});
