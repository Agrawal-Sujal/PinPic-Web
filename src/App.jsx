import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import BottomNav from './components/common/BottomNav';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import UsernameSetup from './pages/auth/UsernameSetup';
import Onboarding from './pages/onboarding/Onboarding';
import MapPage from './pages/map/MapPage';
import OtherUserMapPage from './pages/map/OtherUserMapPage';
import GalleryPage from './pages/gallery/GalleryPage';
import SearchPage from './pages/search/SearchPage';
import ChatPage from './pages/chat/ChatPage';
import ProfilePage from './pages/profile/ProfilePage';
import EditProfilePage from './pages/profile/EditProfilePage';
import OtherUserProfilePage from './pages/profile/OtherUserProfilePage';
import SettingsPage from './pages/settings/SettingsPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, hasCompletedOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark">
        <LoadingSpinner text="Starting PinPic..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force username setup if missing
  if (!user?.username && location.pathname !== '/setup-username') {
    return <Navigate to="/setup-username" replace />;
  }

  // Force onboarding for first-time login
  if (!hasCompletedOnboarding && location.pathname !== '/onboarding' && location.pathname !== '/setup-username') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

// Layout with persistent Floating Bottom Navigation
const ShellLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full">
      <main className="w-full h-full">{children}</main>
      <BottomNav />
    </div>
  );
};

export function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark">
        <LoadingSpinner text="Starting PinPic..." />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/map" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/map" replace /> : <SignUp />}
      />

      {/* Onboarding & Username Setup */}
      <Route
        path="/setup-username"
        element={
          <ProtectedRoute>
            <UsernameSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Main Tab Routes (with Bottom Navigation) */}
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <MapPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gallery"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <GalleryPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <SearchPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <ChatPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <ProfilePage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      {/* Sub-pages */}
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId"
        element={
          <ProtectedRoute>
            <OtherUserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId/map"
        element={
          <ProtectedRoute>
            <OtherUserMapPage />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/map' : '/login'} replace />}
      />

      {/* 404 Catch-All */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;

