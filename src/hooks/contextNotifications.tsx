import { createContext } from 'react';
import { INotification } from '../components/notifications';

export interface NotificationsProps {
    notifications: INotification[];
    addNotification: (message: string, id: string, { href, linkText }?: { linkText?: string, href?: string }) => void;
}

export const NotificationsContext = createContext<NotificationsProps>({
    notifications: [],
    addNotification: () => { },
});

export default NotificationsContext;
