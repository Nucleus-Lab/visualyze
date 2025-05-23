import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FaPaperPlane, FaCrown } from 'react-icons/fa';
import { addMessageNode, updateNodeWithAIContent } from '../utils/chatHistoryService';
import React from "react";

const Chat = forwardRef(({ 
  hasSubscription, 
  onSubscribe, 
  activeConversationId, 
  activeNodeId, 
  onMessageSent,
  messages: externalMessages,
  setMessages: setExternalMessages,
  refreshFileExplorer,
  collapseChat,
  handleChatMessage
}, ref) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [isTypingResponse, setIsTypingResponse] = useState(false);

  // Expose the inputRef's focus method to parent components
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    }
  }));

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

    console.log("adding user message to UI")

    // Add user message to UI
    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setExternalMessages(prev => [...prev, userMessage]);

    console.log("store the user input to send later")
    
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

      // Use the handleChatMessage function from App.jsx if provided
      if (handleChatMessage) {
        console.log("await handleChatMessage")
        const data = await handleChatMessage(userInput);

        console.log("removing the loading messages")
        
        // Remove the loading message
        setExternalMessages(prev => prev.filter(msg => msg !== loadingMessage));
        
        // Show typing animation
        setIsTypingResponse(true);
        
        // Add AI response to UI with the generated visualization info
        const aiResponseText = Array.isArray(data.filenames) 
          ? (data.filenames.length === 1
            ? `I've created a visualization based on your prompt. The visualization '${data.filenames[0].split('/').pop()}' has been added to the canvas. You can interact with it alongside any existing visualizations.`
            : `I've created ${data.filenames.length} visualizations based on your prompt: ${data.filenames.map(f => `'${f.split('/').pop()}'`).join(', ')}. They have been added to the canvas. You can interact with them alongside any existing visualizations.`)
          : `I've created a visualization based on your prompt. The visualization has been added to the canvas. You can interact with it alongside any existing visualizations.`;
        
        // Simulate typing delay for better UX
        setTimeout(() => {
          const aiMessage = {
            text: aiResponseText,
            sender: 'ai',
            timestamp: new Date().toISOString(),
          };
    
          setExternalMessages(prev => [...prev, aiMessage]);
          setIsTypingResponse(false);
          
        }, 500);
      } 
      
      // Notify parent component about the new message
      if (onMessageSent && activeConversationId) {
        onMessageSent(activeConversationId, { id: userNodeId });
      }

      // If collapseChat is provided, use it to hide the chat pane
      if (collapseChat) {
        console.log("collapsing chat pane")
        collapseChat(); // Will hide the chat pane
      }
    } catch (error) {
      console.error("Error handling chat message:", error);
      
      // Remove any loading message
      setExternalMessages(prev => prev.filter(msg => msg.text !== "Processing your request..."));
      setIsTypingResponse(false);
      
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
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
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
                } ${message.isSystem ? 'italic text-accent2' : ''}`}
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
        
        {/* Typing indicator */}
        {isTypingResponse && (
          <div className="flex items-start gap-2 mb-3">
            <span className="text-[#3C3C4E] text-sm mt-1">$</span>
            <div className="p-2 rounded-lg bg-[#1A1A24] text-gray-100">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
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
            ref={inputRef}
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
});

export default React.memo(Chat); 