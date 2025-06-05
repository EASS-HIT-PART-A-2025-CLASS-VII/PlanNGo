import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg.includes('React Router Future Flag Warning')) return;
    console.warn(msg);
  });
});

afterAll(() => {
  console.warn.mockRestore();
});

describe('Navbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // בדיקה שהתפריט של אורח מוצג כראוי
  test('renders guest navigation links', () => {
    useAuth.mockReturnValue({ user: null });

    render(
      <MemoryRouter>
        <Navbar role="guest" />
      </MemoryRouter>
    );

    expect(screen.getByText('Recommended Trips')).toBeInTheDocument();
    expect(screen.getByText('AI Trip Planner')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  // בדיקה שהתפריט של משתמש מוצג כראוי
  test('renders user navigation links', () => {
    useAuth.mockReturnValue({ user: { username: 'Lian', profile_image_url: '' } });

    render(
      <MemoryRouter>
        <Navbar role="user" />
      </MemoryRouter>
    );

    expect(screen.getByText('My Trips')).toBeInTheDocument();
    expect(screen.getByText('Recommended Trips')).toBeInTheDocument();
    expect(screen.getByText('AI Trip Planner')).toBeInTheDocument();
    expect(screen.getByText('Hello Lian')).toBeInTheDocument();
  });

  // בדיקה שהתפריט של אדמין מוצג כראוי
  test('renders admin navigation links', () => {
    useAuth.mockReturnValue({ user: { username: 'admin', profile_image_url: '' } });

    render(
      <MemoryRouter>
        <Navbar role="admin" />
      </MemoryRouter>
    );

    expect(screen.getByText('Users Management')).toBeInTheDocument();
    expect(screen.getByText('Recommended Trips')).toBeInTheDocument();
    expect(screen.getByText('AI Trip Planner')).toBeInTheDocument();
    expect(screen.getByText('Hello Admin')).toBeInTheDocument();
  });

  // בדיקה של פתיחה וסגירה של תפריט פרופיל למשתמש
  test('toggles profile menu for user', () => {
    useAuth.mockReturnValue({ user: { username: 'Lian', profile_image_url: '' } });

    render(
      <MemoryRouter>
        <Navbar role="user" />
      </MemoryRouter>
    );

    const profileIcon = screen.getByAltText('User');
    fireEvent.click(profileIcon);

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
