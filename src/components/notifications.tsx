import { useEffect } from 'react';

export interface INotification {
    title?: string;
    message: string;
    href?: string;
    linkText?: string;
    id?: string;
    timestamp?: number;
}

export interface NotificationProps {
    messages: INotification[];
    removeMessage: (id: string) => void;
}

const SysNotifications = ({ messages, removeMessage }: NotificationProps) => {
    const now = new Date().getTime();
    const newMessages = messages.filter((message) => {
        return message.timestamp && now - message.timestamp < 12000;
    });

    useEffect(() => {
    }, [messages]);

    return <div
        style={{ visibility: messages.length > 0 ? "visible" : "hidden" }}
        className='notifications text-sm'
        id='notifications'>{
            newMessages.map((message, index) => (
                <div key={`${index}`} className='notification' onClick={() => {
                    if (message.id) {
                        removeMessage(message.id)
                    }
                }}>
                    <span>{message.message}</span>
                    {message.href && <a href={message.href} target='_blank'>{message.linkText ?? message.href.substring(0, 21)}</a>}
                </div>
            ))
        }</div>;
};

export default SysNotifications;