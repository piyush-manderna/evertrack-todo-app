import { useNotification } from '../../context/NotificationContext';
import Notification from './Notification';

export default function NotificationContainer() {
  const { notifications } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map(n => (
        <Notification key={n.id} notification={n} />
      ))}
    </div>
  );
}
