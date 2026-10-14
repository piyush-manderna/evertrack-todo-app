import { useNotification } from '../../context/NotificationContext';

export default function Notification({ notification }) {
  const { removeNotification } = useNotification();

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⏰',
    info: 'ℹ',
  };

  const handleAction = () => {
    removeNotification(notification.id);
    notification.action.onClick();
  };

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-icon">{icons[notification.type] || '✓'}</div>
      <div className="notification-body">
        <div className="notification-title">{notification.title}</div>
        {notification.message && (
          <div className="notification-message">{notification.message}</div>
        )}
      </div>
      {notification.action && (
        <button
          type="button"
          className="notification-action"
          onClick={handleAction}
        >
          {notification.action.label}
        </button>
      )}
      <button
        className="notification-close"
        onClick={() => removeNotification(notification.id)}
        aria-label="Dismiss"
      >✕</button>
    </div>
  );
}
