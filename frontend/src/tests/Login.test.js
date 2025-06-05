import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  login: jest.fn(),
}));

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear(); 
  });

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router will begin wrapping state updates') ||
      msg.includes('Relative route resolution within Splat routes')
    ) {
      return;
    }
    console.warn(msg); // כל שאר ה־warn ימשיכו כרגיל
  });
});

  // בדיקה 1: הטופס נטען ומציג את השדות והכפתור
  test('renders login form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  // בדיקה 2: הצגת הודעת שגיאה כאשר ההתחברות נכשלת
  test('shows error on invalid login', async () => {
    api.login.mockRejectedValueOnce(new Error('Invalid')); 
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  // בדיקה 3: התחברות מוצלחת – שמירה של טוקן וניווט לעמוד הבית
  test('redirects and saves token on successful login', async () => {
    api.login.mockResolvedValueOnce({ data: { access_token: 'token123' } }); // התחברות מוצלחת
    
    const originalHref = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: jest.fn() },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('token123');
    });
    expect(window.location.href).toBe('/');
    window.location.href = originalHref; 
  });

  // "Logging in..." בדיקה 4: בזמן התחברות הכפתור הופך ל- 
  test('disables button and shows loading during login', async () => {
    api.login.mockImplementation(() => new Promise(() => {})); // מדמים התחברות "תקועה" שלא מסתיימת
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });
});
