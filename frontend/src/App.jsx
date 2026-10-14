import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import NotificationContainer from './components/notifications/NotificationContainer';
import CustomCursor from './components/common/CustomCursor';
import ReactiveDots from './components/layout/ReactiveDots';
import AddTaskModal from './components/tasks/AddTaskModal';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Today from './pages/Today';
import Upcoming from './pages/Upcoming';
import Incoming from './pages/Incoming';
import Finished from './pages/Finished';
import Stats from './pages/Stats';
import { useState } from 'react';
import { useNotification } from './context/NotificationContext';
import useDeadlineChecker from './hooks/useDeadlineChecker';

// Inner layout (rendered only when logged in)
function AppLayout() {
  const { showNotification } = useNotification();
  const [showAddTask, setShowAddTask] = useState(false);

  // Background deadline monitoring
  useDeadlineChecker();

  const handleTaskAdded = (task) => {
    showNotification('Task added', `"${task.title}" was added.`, 'success');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
    setShowAddTask(false);
  };

  return (
    <div className="app-layout">
      <ReactiveDots />
      <Sidebar onAddTask={() => setShowAddTask(true)} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today"    element={<Today onAddTask={() => setShowAddTask(true)} />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/incoming" element={<Incoming onAddTask={() => setShowAddTask(true)} />} />
          <Route path="/finished" element={<Finished />} />
          <Route path="/stats"    element={<Stats />} />
        </Routes>
      </main>

      {showAddTask && (
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onAdded={handleTaskAdded}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <CustomCursor />
          <TopBar />
          <Routes>
            {/* Public homepage: logged-in users are redirected to /today */}
            <Route path="/" element={<Home />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
          <NotificationContainer />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
