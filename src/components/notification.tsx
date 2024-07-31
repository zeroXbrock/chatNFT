import { FunctionComponent } from 'react';

interface Notification {
    title?: string;
    message: string;
    href: string;
    linkText: string;
    id?: string;
    timestamp?: number;
}

interface NotificationProps {
    messages: Notification[];
}

const Notification: FunctionComponent<NotificationProps> = ({ messages }) => {
    const now = new Date().getTime();
    const newMessages = messages.filter((message) => {
        return message.timestamp && now - message.timestamp < 12000;
    });

    return <div
        style={{ visibility: messages.length > 0 ? "visible" : "hidden" }}
        className='notifications text-sm'
        id='notifications'>{
            newMessages.map((message, index) => (
                <div key={`${index}`} className='notification'>
                    <span>{message.message}</span>
                    <a href={message.href} target='_blank'>{message.linkText}</a>
                </div>
            ))
        }</div>;
};

export default Notification;