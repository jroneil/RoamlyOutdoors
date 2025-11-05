import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import EventDetailsPage from './pages/EventDetailsPage';
import HomePage from './pages/HomePage';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
