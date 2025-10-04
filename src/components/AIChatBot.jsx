// src/components/AIChatBot.jsx
import { useState, useRef, useEffect } from 'react';
import ChatbotIcon from './AIChatBotComponents/ChatbotIcon';
import ChatForm from './AIChatBotComponents/ChatForm';
import ChatMessage from './AIChatBotComponents/ChatMessage';
import { info } from './AIChatBotComponents/info';


import './AIChatBot.css';
const AIChatBot = () => {
    const [chatHistory, setChatHistory] = useState([{
        hideInChat: true,
        role: 'assistant',
        text: info
    }]);
    const [showChatbot, setShowChatbot] = useState(false);
    const chatBodyRef = useRef();

    const generateBotResponse = async (history) => {
        const updateHistory = (botReply) => {

            setChatHistory(prevHistory => [
                ...prevHistory.filter(msg => msg.text !== "Thinking"),
                { role: 'assistant', text: botReply } // Map 'model' to 'assistant'
            ]);
        };

        // ✅ Convert history to OpenAI format
        const messages = history.map(({ role, text }) => ({
            role: role === 'model' ? 'assistant' : role, // Map 'model' to 'assistant'
            content: text
        }));

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}` // make sure this is set
            },
            body: JSON.stringify({
                messages,
                model: "openai/gpt-4o",
                temperature: 1,
                max_tokens: 4096,
                top_p: 1
            })
        };

        try {
            const response = await fetch("https://models.github.ai/inference/chat/completions", requestOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || "Failed to fetch bot response");
            }

            console.log(data);
            // ✅ Extract bot reply from OpenAI format
            const botReply = data.choices[0].message.content.trim();

            updateHistory(botReply);

        } catch (error) {
            updateHistory("Error generating bot response:", error);
        }
    };

    useEffect(() => {
        // Scroll to the bottom whenever chatHistory changes

        chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });

    }, [chatHistory]);

    return (
        <>
            {/*ai chatbot*/}
            < div className={`container ${showChatbot ? "show-chatbot" : ""}`} >
                <button onClick={() => setShowChatbot(prev => !prev)} id="chatbot-toggler">
                    <span className='material-symbols-rounded'>mode_comment</span>
                    <span className='material-symbols-rounded'>close</span>
                </button>
                <div className='chatbot-popup' style={{ maxWidth: "clamp(250px, 50%, 400px)", maxHeight: "clamp(300px, 70%, 600px)" }}>
                    {/* Chatbot header with icon and title */}
                    <div className='chat-header'>
                        <div className='header-info'>
                            <ChatbotIcon />
                            <h2 className='logo-text'>Sameer</h2>
                        </div>

                    </div>
                    {/* Chatbot body for messages */}
                    <div ref={chatBodyRef} className="chat-body">
                        <div className="message bot-message">
                            <ChatbotIcon />
                            <p className='message-text'>
                                Hello! I am Sameer, your AI assistant. I can help you with information about the images and astronomy. Feel free to ask me anything!
                            </p>
                        </div>
                        {chatHistory.map((chat, index) => (
                            <ChatMessage key={index} chat={chat} />
                        ))}

                    </div>
                    {/* Chatbot footer with input field */}
                    <div className="chat-footer">
                        <ChatForm chatHistory={chatHistory} setChatHistory={setChatHistory} generateBotResponse={generateBotResponse} />
                    </div>
                </div>


            </div >
        </>
    );
};

export default AIChatBot;