import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaCrown } from 'react-icons/fa';
import { addMessageNode, updateNodeWithAIContent } from '../utils/chatHistoryService';

const Chat = ({ 
  hasSubscription, 
  onSubscribe, 
  activeConversationId, 
  activeNodeId, 
  onMessageSent,
  messages: externalMessages,
  setMessages: setExternalMessages,
  refreshFileExplorer
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [externalMessages]);

  // Add welcome message if no messages exist
  useEffect(() => {
    if (!externalMessages || externalMessages.length === 0) {
      const welcomeMessage = {
        text: hasSubscription 
          ? "Welcome to the AI Terminal. How can I help you analyze your data today?" 
          : "Welcome! Please subscribe to use the AI Terminal features.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      
      setExternalMessages([welcomeMessage]);
    }
  }, [hasSubscription, externalMessages, setExternalMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check for subscription
    if (!hasSubscription) {
      // Add system message about subscription requirement
      const subscriptionMessage = {
        text: "⚠️ You need an active subscription to use this feature. Please subscribe to continue.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setExternalMessages(prev => [...prev, subscriptionMessage]);
      setInput('');
      return;
    }

    // Add user message to UI
    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setExternalMessages(prev => [...prev, userMessage]);
    
    // Store the input to send later
    const userInput = input;
    setInput(''); // Clear input field

    try {
      // Add loading message to UI to indicate processing
      const loadingMessage = {
        text: "Processing your request...",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setExternalMessages(prev => [...prev, loadingMessage]);
      
      // Save user message to backend if we have an active conversation
      let userNodeId = null;
      if (activeConversationId) {
        // Send the user message to the backend
        const userNode = await addMessageNode(
          activeConversationId,
          userInput,
          'user',
          activeNodeId // If responding to a historical node, this will create a branch
        );
        userNodeId = userNode.id;
      }

      // Call the AI processing endpoint
      const response = await fetch('http://localhost:8000/api/process-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userInput,
          conversationId: activeConversationId,
          nodeId: userNodeId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process prompt');
      }
      
      // Remove the loading message
      setExternalMessages(prev => prev.filter(msg => msg !== loadingMessage));
      
      // Add AI response to UI with the generated visualization info
      const aiResponseText = `I've created a visualization based on your prompt. You can view it by clicking on '${data.filename}' in the file explorer.`;
      
      const aiMessage = {
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      setExternalMessages(prev => [...prev, aiMessage]);
      
      // No need to update the node with AI response as it's already done by the backend
      
      // Notify parent component about the new message
      if (onMessageSent && activeConversationId) {
        onMessageSent(activeConversationId, { id: userNodeId });
      }

      // Refresh the file explorer to show the new visualization file
      if (refreshFileExplorer) {
        console.log("Refreshing file explorer after generating visualization:", data.filename);
        refreshFileExplorer(data.filename);
      }
    } catch (error) {
      console.error("Error handling chat message:", error);
      
      // Remove any loading message
      setExternalMessages(prev => prev.filter(msg => msg.text !== "Processing your request..."));
      
      // Show error in chat
      setExternalMessages(prev => [...prev, {
        text: `Error: ${error.message || 'Failed to process your message. Please try again.'}`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#22222E] font-mono">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {externalMessages.map((message, index) => (
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
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form at bottom */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-[#1A1A24] p-2">
        {!hasSubscription && (
          <div className="mb-2 px-2 py-1.5 bg-[#2D2D3B] text-[#D4A017] rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FaCrown className="w-3 h-3" />
              <span>Subscribe to unlock AI features</span>
            </div>
            <button
              type="button"
              onClick={onSubscribe}
              className="px-2 py-0.5 bg-[#D4A017] text-white rounded hover:bg-[#B38A14] transition-colors text-xs"
            >
              Subscribe Now
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[#3C3C4E] text-sm">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasSubscription ? "Enter your command..." : "Subscribe to start using AI features..."}
            className={`flex-1 p-2 rounded-lg bg-[#1A1A24] text-white border border-[#2D2D3B] focus:outline-none focus:border-[#3C3C4E] placeholder-gray-500 text-sm font-mono ${!hasSubscription && 'opacity-50'}`}
            disabled={!hasSubscription}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#2D2D3B] text-white rounded-lg hover:bg-[#3C3C4E] transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim() || !hasSubscription}
          >
            <FaPaperPlane className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 