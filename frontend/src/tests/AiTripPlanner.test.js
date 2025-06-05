import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiTripPlanner from '../pages/AiTripPlanner';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  getTripTypes: jest.fn(),
  generateCustomTrip: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router will begin wrapping') ||
      msg.includes('Relative route resolution')
    ) return;
    console.warn(msg);
  });
});

describe('AiTripPlanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  // בדיקה: טופס תכנון טיול מוצג כראוי + סוגי טיול נטענים מהשרת
  test('renders form and loads trip types', async () => {
    api.getTripTypes.mockResolvedValueOnce({ data: ['Adventure', 'City Break'] });

    render(
      <MemoryRouter>
        <AiTripPlanner />
      </MemoryRouter>
    );

    expect(screen.getByText(/plan your trip with ai/i)).toBeInTheDocument();
    expect(screen.getByText(/generate trip/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });
    expect(screen.getByText('City Break')).toBeInTheDocument();
  });

  // בדיקה: מילוי טופס, שליחה וניווט מוצלח לתוצאה
  test('submits form and navigates on success', async () => {
    api.getTripTypes.mockResolvedValueOnce({ data: ['Adventure'] });
    api.generateCustomTrip.mockResolvedValueOnce({ data: { trip_plan: [] } });

    render(
      <MemoryRouter>
        <AiTripPlanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Paris' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '5' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '2' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Adventure' } });

    expect(select.value).toBe('Adventure');

    fireEvent.click(screen.getByRole('button', { name: /generate trip/i }));

    await waitFor(() => {
      expect(api.generateCustomTrip).toHaveBeenCalledWith({
        destination: 'Paris',
        num_days: 5,
        num_travelers: 2,
        trip_type: 'Adventure',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/ai/trip-result', expect.any(Object));
    });
  });

  // בדיקה: הצגת כפתור טעינה נעול בזמן שליחה
  test('shows loading state on submit', async () => {
    api.getTripTypes.mockResolvedValueOnce({ data: ['Adventure'] });
    api.generateCustomTrip.mockImplementation(() => new Promise(() => {})); // מבטיח שלא יפתר

    render(
      <MemoryRouter>
        <AiTripPlanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Paris' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '5' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '2' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Adventure' } });

    fireEvent.click(screen.getByRole('button', { name: /generate trip/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });
  });

  // בדיקה: הצגת שגיאה כאשר קריאת סוגי הטיול נכשלת
  test('shows error if trip types fetch fails', async () => {
    api.getTripTypes.mockRejectedValueOnce({ response: { data: { detail: 'fail' } } });

    render(
      <MemoryRouter>
        <AiTripPlanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('fail');
    });
  });

  // בדיקה: הצגת שגיאה כאשר יצירת טיול נכשלת
  test('shows error if trip generation fails', async () => {
    api.getTripTypes.mockResolvedValueOnce({ data: ['Adventure'] });
    api.generateCustomTrip.mockRejectedValueOnce({ response: { data: { detail: 'fail' } } });

    render(
      <MemoryRouter>
        <AiTripPlanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Paris' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '5' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '2' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Adventure' } });

    fireEvent.click(screen.getByRole('button', { name: /generate trip/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('fail');
    });
  });
});
