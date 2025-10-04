import '../AIChatBot.css';
import ChatbotIcon from './ChatbotIcon';

const ChatMessage = ({ chat }) => {
    return (
        !chat.hideInChat && (
        <div className={`message ${chat.role === "assistant" ? 'bot' : 'user'}-message`}>
            {chat.role === "assistant" && <ChatbotIcon />}
            <p className='message-text'>{chat.text}</p>
        </div>)
    );
};



export default ChatMessage;