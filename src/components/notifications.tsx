import { keccak256, stringToHex } from '@flashbots/suave-viem';

export interface INotification {
    title?: string;
    message: string;
    href?: string;
    linkText?: string;
    id: string;
    timestamp?: number;
}

export interface NotificationProps {
    messages: INotification[];
    removeMessage: (id: string) => void;
}

const SysNotifications = ({ messages, removeMessage }: NotificationProps) => {
    return <div
        style={messages.length > 0 && messages[0].id ? {} : { backgroundColor: "#0000" }}
        className='notifications text-sm'
        id='notifications'>{
            messages.map((message, idx) => (
                <div key={`${keccak256(stringToHex(message.message))}${idx}${message.id || "undef"}`} className='notification' onClick={() => {
                    removeMessage(message.id)
                }}>
                    <span>{message.message}</span>
                    {message.href && <a href={message.href} target='_blank'>{message.linkText ?? message.href.substring(0, 21)}</a>}
                </div>
            ))
        }</div>;
};

export default SysNotifications;