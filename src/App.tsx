import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminLayout } from './layouts/AdminLayout';
import { OperatorLayout } from './layouts/OperatorLayout';

// Pages - We will need to update/create these next, but importing for structure
import { Dashboard } from './pages/Dashboard';
import { Registration } from './pages/Registration';
import { StudentList } from './pages/StudentList';
import { StudentProfile } from './pages/StudentProfile';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AdminPayments from './pages/admin/Payments';
import Payments from './pages/operator/Payments';
import MessageCenter from './pages/admin/MessageCenter';
import { AdminStudentList } from './pages/admin/StudentList';

// Placeholders for new pages to avoid build errors while we implement them
// const Messages = () => <div>Messages Content</div>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="students" element={<AdminStudentList />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="messages" element={<MessageCenter />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          {/* Operator Routes */}
          <Route path="/operator" element={<OperatorLayout />}>
            <Route index element={<Navigate to="/operator/register" replace />} />
            <Route path="register" element={<Registration />} />

            <Route path="payments" element={<Payments />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="messages" element={<MessageCenter />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
