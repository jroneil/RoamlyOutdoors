import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import EventDetailsPage from './pages/EventDetailsPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillingOverviewPage from './pages/billing/BillingOverviewPage';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/profile"
          element={(
            <RoleProtectedRoute>
              <ProfilePage />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/billing"
          element={(
            <RoleProtectedRoute>
              <BillingOverviewPage />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/organizer"
          element={(
            <RoleProtectedRoute allowRoles={['organizer', 'admin']}>
              <OrganizerDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <RoleProtectedRoute allowRoles={['admin']}>
              <AdminDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
