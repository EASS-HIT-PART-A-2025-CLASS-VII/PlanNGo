import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../pages/Signup';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  signup: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ secure_url: 'http://img.com/img.jpg' }),
  })
);

describe('Signup page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg?.includes('React Router Future Flag Warning') ||
      msg?.includes('Relative route resolution')
    ) return;
    console.warn(msg);
  });
});

  // בודק שהטופס מוצג כראוי עם כל השדות
  test('renders signup form', () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/password/i)[0]).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/password/i)[1]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  // בודק שהתראה מוצגת כאשר הסיסמאות לא תואמות
  test('shows error if passwords do not match', async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[0], { target: { value: '1234' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[1], { target: { value: '5678' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    const error = await screen.findByText(/passwords do not match/i);
    expect(error).toBeInTheDocument();
  });
  
  // בודק שהתראה מוצגת כאשר העלאת התמונה נכשלת
  test('shows error if image upload fails', async () => {
    fetch.mockImplementationOnce(() => Promise.reject('fail'));

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[0], { target: { value: '1234' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[1], { target: { value: '1234' } });

    const file = new File(['img'], 'img.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('profile-upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    const error = await screen.findByText(/image upload failed/i);
    expect(error).toBeInTheDocument();
  });

  // בודק שאחרי ההרשמה יש ניווט כראוי
  test('calls signup and navigates on success', async () => {
    api.signup.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[0], { target: { value: '1234' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[1], { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(api.signup).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // בודק שהתראת שגיאה מוצגת כאשר ההרשמה נכשלת
  test('shows error if signup fails', async () => {
    api.signup.mockRejectedValueOnce({ response: { data: { detail: 'Email exists' } } });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[0], { target: { value: '1234' } });
    fireEvent.change(screen.getAllByPlaceholderText(/password/i)[1], { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Email exists');
    });
  });
});
