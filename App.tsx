import React, { useState, useEffect, createContext, useContext } from 'react';
import { MemoryRouter, Routes, Route, Navigate, Link, useLocation } from './lib/router';
import { db } from './services/storage';
import { firebaseDb } from './services/firebaseStorage';
import { isMultiUserEnabled } from './services/storageAdapter';
import { User, UserRole } from './types';
import { Trophy, Users, User as UserIcon, LogOut, PlusCircle, Activity } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTournament from './pages/CreateTournament';
import TournamentDetail from './pages/TournamentDetail';
import Profile from './pages/Profile';

// Context
interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => void;
  register: (username: string, display: string, email?: string, password?: string) => void;
  logout: () => void;
  isMultiUser: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const navItemClass = (path: string) => 
    `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path 
        ? 'bg-indigo-100 text-indigo-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Trophy className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">SquashTrack</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4 items-center">
                <Link to="/" className={navItemClass('/')}>
                  <Activity className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/create" className={navItemClass('/create')}>
                  <PlusCircle className="h-4 w-4" />
                  <span>New Tournament</span>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Link to="/profile" className={navItemClass('/profile')}>
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{user.displayName}</span>
              </Link>
              <button
                onClick={logout}
                className="ml-4 p-2 text-gray-400 hover:text-gray-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMultiUserEnabled) {
      // Firebase authentication
      firebaseDb.initAuth((user) => {
        setUser(user);
        setLoading(false);
      });
    } else {
      // LocalStorage authentication
      const currentUser = db.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      if (isMultiUserEnabled) {
        // Firebase login requires email and password
        if (!password) {
          alert('Password is required for multi-user mode');
          return;
        }
        const u = await firebaseDb.login(username, password);
        setUser(u);
      } else {
        // LocalStorage login (original behavior)
        const u = db.login(username);
        if (u) setUser(u);
        else alert('User not found. Please register.');
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const register = async (username: string, display: string, email?: string, password?: string) => {
    try {
      if (isMultiUserEnabled) {
        // Firebase registration
        if (!email || !password) {
          alert('Email and password are required for multi-user mode');
          return;
        }
        const u = await firebaseDb.register(username, display, email, password);
        setUser(u);
      } else {
        // LocalStorage registration (original behavior)
        const u = db.register(username, display);
        setUser(u);
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const logout = async () => {
    if (isMultiUserEnabled) {
      await firebaseDb.logout();
    } else {
      db.logout();
    }
    setUser(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isMultiUser: isMultiUserEnabled }}>
      <MemoryRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/create" element={user ? <CreateTournament /> : <Navigate to="/login" />} />
            <Route path="/tournament/:id" element={user ? <TournamentDetail /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
