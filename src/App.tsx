import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import Recordings from './pages/Recordings';
import RecordingDetails from './pages/RecordingDetails';
import Assessments from './pages/Assessments';
import StatisticalAnalysis from './pages/StatisticalAnalysis';
import ArchivedRecords from './pages/ArchivedRecords';
import Users from './pages/Users';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route
            path="/live-monitoring"
            element={
              <ProtectedRoute>
                <LiveMonitoring />
              </ProtectedRoute>
            }
          />
          <Route path="/recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
          <Route
            path="/recordings/:id"
            element={
              <ProtectedRoute>
                <RecordingDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
          <Route
            path="/statistical-analysis"
            element={
              <ProtectedRoute>
                <StatisticalAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/archived-records"
            element={
              <ProtectedRoute>
                <ArchivedRecords />
              </ProtectedRoute>
            }
          />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
