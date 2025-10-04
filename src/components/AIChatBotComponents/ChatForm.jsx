import '../AIChatBot.css';
import { useRef } from 'react';
const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
    const inputRef = useRef();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const message = inputRef.current.value.trim();
        if (!message) return;
        inputRef.current.value = '';

        // Update chat history with the new user message
        setChatHistory(prevHistory => [...prevHistory, { role: 'user', text: message }]);
        // Simulate bot response after a delay
        setTimeout(() => {
            setChatHistory(prevHistory => [...prevHistory, { role: 'assistant', text: "Thinking" }]);
            
            // Call the function to generate bot response
            generateBotResponse([...chatHistory, { role: 'assistant', text: `Using the details provided above, please adress this query :${message}` }]);
        }, 600);
    };
    return (
        <form action="#" className='chat-form' onSubmit={handleFormSubmit}>
            <input ref={inputRef} type="text" className='message-input' placeholder='Type your message...' required />
            <button className="material-symbols-rounded ">
                keyboard_arrow_up
            </button>

        </form>
    );
};

export default ChatForm;