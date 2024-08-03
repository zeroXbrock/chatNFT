import { createContext } from 'react';
import { INotification } from '../components/notification';

export interface NotificationsProps {
    notifications: INotification[];
    setNotifications: (n: INotification[]) => void;
    addNotification: (message: string, id: string, { href, linkText }?: { linkText?: string, href?: string }) => void;
}

export const NotificationsContext = createContext<NotificationsProps>({
    notifications: [],
    setNotifications: () => { },
    addNotification: () => { },
});

export default NotificationsContext;
