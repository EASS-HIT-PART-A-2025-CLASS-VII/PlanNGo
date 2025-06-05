import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../pages/Profile';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../services/api', () => ({
  updateUserProfile: jest.fn(),
  forgotPassword: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ secure_url: 'http://img.com/img.jpg' }) }));

describe('Profile page', () => {
  const user = { username: 'lian', email: 'lian@a.com', profile_image_url: 'http://img.com/img.jpg' };
  const setUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user, setUser });
    window.alert = jest.fn();
  });

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg.includes('React Router will begin wrapping state updates') ||
      msg.includes('Relative route resolution within Splat routes')
    ) {
      return;
    }
    console.warn(msg);
  });
});

   // בדיקה: האם המידע בפרופיל מוצג במסך (טקסטים, אימייל, שם משתמש, תמונה)
  test('renders profile info', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue(user.email)).toBeInTheDocument();
    expect(screen.getByDisplayValue(user.username)).toBeInTheDocument();
    expect(screen.getByAltText('Profile')).toBeInTheDocument();
  });

  // בדיקה: האם שינוי שם המשתמש עובד ונשלחת בקשה לשרת
  test('updates username', async () => {
    api.updateUserProfile.mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByDisplayValue(user.username), { target: { value: 'newname' } });
    fireEvent.click(screen.getByRole('button', { name: /update profile/i }));
    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith({ update_username: 'newname' });
    });
    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });

  // בדיקה: האם מוצגת שגיאה מתאימה אם שינוי השם נכשל (למשל, שם תפוס)
  test('shows error if update fails', async () => {
    api.updateUserProfile.mockRejectedValueOnce({ response: { data: { detail: 'Username exists' } } });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByDisplayValue(user.username), { target: { value: 'taken' } });
    fireEvent.click(screen.getByRole('button', { name: /update profile/i }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Username exists');
    });
  });

  // בדיקה: האם מוצגת הודעה כשמנסים לשמור בלי לבצע שינויים
  test('shows message if no changes made', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /update profile/i }));
    expect(screen.getByText(/no changes made/i)).toBeInTheDocument();
  });

  // בדיקה: האם נשלחת בקשת איפוס סיסמה והמשתמש מקבל אישור
  test('sends reset password email', async () => {
    api.forgotPassword.mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/click here/i));
    await waitFor(() => {
      expect(api.forgotPassword).toHaveBeenCalledWith(user.email);
    });
    expect(await screen.findByText(/reset link sent/i)).toBeInTheDocument();
  });

   // בדיקה: האם מוצגת שגיאה אם קריאת איפוס סיסמה נכשלת
  test('shows error if reset password fails', async () => {
    api.forgotPassword.mockRejectedValueOnce(new Error('fail'));
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/click here/i));
    await waitFor(() => {
      expect(screen.getByText(/failed to send reset link/i)).toBeInTheDocument();
    });
  });
});
