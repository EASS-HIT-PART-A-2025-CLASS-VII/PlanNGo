import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersManagement from '../pages/UsersManagement';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  getAllUsers: jest.fn(),
  deleteUser: jest.fn(),
}));

describe('UsersManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true); 
    window.alert = jest.fn();
  });

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (
      msg?.includes("React Router Future Flag Warning") ||
      msg?.includes("Relative route resolution within Splat routes")
    ) return;
    console.warn(msg);
  });
});

  // בודק טעינה מוצלחת של משתמשים
  test('renders users from API', async () => {
    api.getAllUsers.mockResolvedValueOnce({
      data: [
        { id: 1, email: 'admin@example.com', username: 'admin' },
        { id: 2, email: 'user@example.com', username: 'user' },
      ],
    });

    render(
      <MemoryRouter>
        <UsersManagement />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  // בודק מחיקת משתמש בלחיצה
  test('deletes user on delete button click', async () => {
    api.getAllUsers.mockResolvedValueOnce({
      data: [{ id: 1, email: 'test@example.com', username: 'tester' }],
    });
    api.deleteUser.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <UsersManagement />
      </MemoryRouter>
    );

    expect(await screen.findByText('test@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/delete user/i));

    await waitFor(() => {
      expect(api.deleteUser).toHaveBeenCalledWith(1);
    });
  });

  // בודק שגיאה בעת טעינת משתמשים
  test('handles error on fetch users', async () => {
    console.error = jest.fn();
    api.getAllUsers.mockRejectedValueOnce(new Error('fetch failed'));

    render(
      <MemoryRouter>
        <UsersManagement />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
  });

  // בודק שגיאה בעת מחיקת משתמש
  test('handles error on delete', async () => {
    api.getAllUsers.mockResolvedValueOnce({
      data: [{ id: 1, email: 'err@example.com', username: 'erruser' }],
    });

    api.deleteUser.mockRejectedValueOnce({
      response: { data: { detail: 'delete failed' } },
    });

    render(
      <MemoryRouter>
        <UsersManagement />
      </MemoryRouter>
    );

    expect(await screen.findByText('err@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/delete user/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('delete failed');
    });
  });
});
