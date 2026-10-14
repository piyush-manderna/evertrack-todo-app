import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // options (all optional):
  //   duration   - ms before auto-dismiss (default 4000)
  //   action     - { label, onClick } renders a button on the toast (e.g. Undo)
  //   replaceKey - a new toast with the same key replaces the old one instead of stacking
  const showNotification = useCallback((title, message = '', type = 'success', options = {}) => {
    const { duration = 4000, action = null, replaceKey = null } = options;
    const id = Date.now() + Math.random();

    setNotifications(prev => [
      ...(replaceKey ? prev.filter(n => n.replaceKey !== replaceKey) : prev),
      { id, title, message, type, action, replaceKey },
    ]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
