import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // TODO: Implement AI response logic here
    // For now, we'll just add a mock response
    const aiMessage = {
      text: 'This is a mock AI response. The actual AI integration will be implemented later.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };

    setTimeout(() => {
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#22222E] font-mono">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center mt-4 text-sm">
            <span className="text-[#3C3C4E]">$</span> Ready to analyze your data...
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-3 ${
                message.sender === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
              }`}
            >
              <div className="flex items-start gap-2 w-full">
                {message.sender === 'ai' && (
                  <span className="text-[#3C3C4E] text-sm mt-1">$</span>
                )}
                <div
                  className={`p-2 rounded-lg max-w-[85%] text-sm ${
                    message.sender === 'user'
                      ? 'bg-[#2D2D3B] text-white'
                      : 'bg-[#1A1A24] text-gray-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 px-1">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form at bottom */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-[#1A1A24] p-2">
        <div className="flex items-center gap-2">
          <span className="text-[#3C3C4E] text-sm">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your command..."
            className="flex-1 p-2 rounded-lg bg-[#1A1A24] text-white border border-[#2D2D3B] focus:outline-none focus:border-[#3C3C4E] placeholder-gray-500 text-sm font-mono"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#2D2D3B] text-white rounded-lg hover:bg-[#3C3C4E] transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            <FaPaperPlane className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 