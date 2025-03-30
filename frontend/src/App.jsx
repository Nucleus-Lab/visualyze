import { useState, useEffect, useRef } from 'react'
import FileExplorer from './components/FileExplorer'
import Chat from './components/Chat'
import Toast from './components/Toast'
import ChatHistory from './components/ChatHistory'
import { FaFolder, FaComments, FaChevronRight, FaChevronLeft, FaChevronDown, FaChevronUp, FaCrown, FaToggleOn, FaSignOutAlt, FaHistory } from 'react-icons/fa'
import { usePrivy, useWallets, useLogout } from '@privy-io/react-auth'
import * as d3 from "d3";
import React from "react";
import { checkSubscription, subscribe } from './utils/contract';
import { getConversations, getConversation, createConversation, getNodeBranch } from './utils/chatHistoryService';

function App() {
  const { login, ready, authenticated, user, wallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { logout } = useLogout({
    onSuccess: () => {
      console.log('Successfully logged out');
      // Clear any local state if needed
      localStorage.removeItem('username');
      localStorage.removeItem('walletAddress');
    }
  });
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedVisualizations, setSelectedVisualizations] = useState([])
  const [visualizationComponents, setVisualizationComponents] = useState({})
  const [newestVisualization, setNewestVisualization] = useState(null)
  const newestVizRef = useRef(null)
  const [fileStructure, setFileStructure] = useState({
    visualizations: {}
  })
  
  // Subscription state
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null)
  
  // Toast notification state
  const [toast, setToast] = useState(null)

  // Chat history state
  const [activeTab, setActiveTab] = useState('files');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // State to track when chat is collapsing
  const [isChatCollapsing, setIsChatCollapsing] = useState(false);
  // State to track when visualization is expanding
  const [isVizExpanding, setIsVizExpanding] = useState(false);

  // State to track animations for visualizations
  const [removingViz, setRemovingViz] = useState(null);
  const [addingViz, setAddingViz] = useState(null);

  // State to track recently removed visualizations for animation
  const [removedVisualizations, setRemovedVisualizations] = useState([]);

  // Function to refresh file explorer when new visualizations are created
  const refreshFileExplorer = async (highlightFile = null) => {
    try {
      // Fetch visualization files from backend
      const response = await fetch('http://localhost:8000/api/visualizations')
      const data = await response.json()
      
      // Create file structure and prepare for component loading
      const newFileStructure = {
        visualizations: {}
      }
      
      // Add each visualization file to the structure
      data.files.forEach(fileName => {
        newFileStructure.visualizations[fileName] = null
      })
      
      setFileStructure(newFileStructure)
      console.log('Refreshed visualization files:', data.files)
      
      // Automatically open the file explorer if closed
      if (!isFileExplorerOpen) {
        setIsFileExplorerOpen(true)
      }
      
      // If a specific file should be highlighted, select it and display it in the canvas
      if (highlightFile && data.files.includes(highlightFile)) {
        // Add to selected visualizations if not already included
        if (!selectedVisualizations.includes(highlightFile)) {
          // Always add the new visualization to existing ones, don't replace
          setSelectedVisualizations(prev => [...prev, highlightFile])
          
          // Load visualization component if not already loaded
          loadVisualizationComponent(highlightFile)
          
          // Set as newest visualization for highlighting
          setNewestVisualization(highlightFile)
          
          // Clear the highlight after 4 seconds
          setTimeout(() => {
            setNewestVisualization(null)
          }, 4000)
        }
      }
    } catch (error) {
      console.error('Error refreshing visualization files:', error)
      showToast("Failed to refresh file explorer", null)
    }
  }
  
  // Helper function to load a visualization component
  const loadVisualizationComponent = async (fileName) => {
    if (!visualizationComponents[fileName]) {
      try {
        // Fetch JS code from backend
        const response = await fetch(`http://localhost:8000/api/visualizations/${fileName}`);
        const data = await response.json();

        console.log("Fetched JS Code for:", fileName);

        // Dynamically evaluate the JS code received
        const component = new Function("React", "d3", `
          ${data.content}
          return GeneratedViz;  // Return the component directly
        `)(React, d3);

        // Store the evaluated component in state
        setVisualizationComponents(prev => ({
          ...prev,
          [fileName]: component,
        }));

        console.log("Loaded Visualization Component:", fileName);
      } catch (error) {
        console.error("Error loading visualization:", fileName, error);
      }
    }
  };

  // Function to show toast
  const showToast = (message, txHash = null) => {
    setToast({ message, txHash });
  };

  // Function to hide toast
  const hideToast = () => {
    setToast(null);
  };

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!authenticated) return;
      
      setIsLoadingHistory(true);
      try {
        const conversations = await getConversations();
        setChatHistory(conversations || []);
        
        // Create a default conversation if none exists
        if (!conversations || conversations.length === 0) {
          const newConversation = await createConversation("New Conversation");
          setChatHistory([newConversation]);
          setActiveConversationId(newConversation.id);
        } else {
          // Set the most recent conversation as active
          setActiveConversationId(conversations[0].id);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        showToast("Failed to load chat history", null);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadChatHistory();
  }, [authenticated]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check for Ctrl+I (keyCode 73 for 'I')
      if (e.ctrlKey && e.keyCode === 73) {
        e.preventDefault(); // Prevent default browser behavior
        setIsChatOpen(prev => !prev);
      }
      // Check for Ctrl+B (keyCode 66 for 'B')
      if (e.ctrlKey && e.keyCode === 66) {
        e.preventDefault(); // Prevent default browser behavior
        setIsFileExplorerOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Effect to scan for visualization files
  useEffect(() => {
    refreshFileExplorer();
  }, [])

  // Effect to check subscription status when user is authenticated
  useEffect(() => {
    const checkUserSubscription = async () => {
      if (authenticated && user?.wallet?.address && wallets.length > 0) {
        try {
          console.log("Checking subscription status for user");
          const subscription = await checkSubscription(user.wallet.address, wallets[0]);
          setHasSubscription(subscription.hasSubscription);
          setSubscriptionExpiry(subscription.expiryDate);
          console.log("Subscription status updated:", subscription);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };

    checkUserSubscription();
  }, [authenticated, user?.wallet?.address, wallets]);

  // Effect to scroll to the newest visualization when it's created
  useEffect(() => {
    if (newestVisualization && newestVizRef.current) {
      // Add a small delay to ensure the DOM has updated
      setTimeout(() => {
        newestVizRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [newestVisualization]);

  const handleVisualizationSelect = async (path) => {
    console.log("Selected visualization:", path);
    const fileName = path.split("/").pop();
  
    if (selectedVisualizations.includes(fileName)) {
      // Mark this visualization as removing for animation
      setRemovingViz(fileName);
      // Add to removed list to keep it around during animation
      setRemovedVisualizations(prev => [...prev, fileName]);
      
      // Deselect visualization
      setSelectedVisualizations((prev) => prev.filter((viz) => viz !== fileName));
      setRemovingViz(null);
      
      // Remove from the removed list after animation completes 
      setRemovedVisualizations(prev => prev.filter(v => v !== fileName));
    } else {
      // Select visualization
      setSelectedVisualizations((prev) => [...prev, fileName]);
      setAddingViz(fileName);
      
      // Use the loadVisualizationComponent helper
      await loadVisualizationComponent(fileName);
      
      // Clear animation state after animation completes
      setTimeout(() => {
        setAddingViz(null);
      }, 500);
  
    }
  };

  // Update handleSubscribe to use the contract
  const handleSubscribe = async () => {
    try {
      if (!user?.wallet?.address || wallets.length === 0) {
        console.error('No wallet connected');
        return;
      }

      console.log("Starting subscription process");
      // Subscribe using the contract
      const receipt = await subscribe(wallets[0]);
      
      // Check updated subscription status
      const subscription = await checkSubscription(user.wallet.address, wallets[0]);
      setHasSubscription(subscription.hasSubscription);
      setSubscriptionExpiry(subscription.expiryDate);
      console.log("Subscription completed successfully");
      
      // Show success toast with transaction hash
      showToast('Subscription successful! You now have access to all premium features.', receipt.hash);
    } catch (error) {
      console.error('Error subscribing:', error);
      // Show error toast
      showToast('Subscription failed. Please try again.', null);
    }
  };

  // Handle logout with wallet disconnection
  const handleLogout = async () => {
    try {
      // 1. Try to disconnect wallet if supported
      if (wallet?.disconnect) {
        try {
          await wallet.disconnect();
        } catch (error) {
          console.warn('Wallet disconnect failed, proceeding with logout:', error);
        }
      }
      
      // 2. Use Privy's logout
      await logout();
      
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Handler for selecting a chat node
  const handleChatNodeSelect = async (nodeId, conversationId) => {
    try {
      setActiveNodeId(nodeId);
      setActiveConversationId(conversationId);
      
      // Get the conversation 
      const conversation = await getConversation(conversationId);
      
      if (!conversation || !conversation.nodes || conversation.nodes.length === 0) {
        console.error("No conversation found");
        showToast("Failed to load conversation", null);
        return;
      }
      
      console.log("Received conversation:", conversation);
      
      // Convert nodes to UI message format - now much simpler!
      const messagesFromConversation = [];
      
      // Filter out root nodes and sort by timestamp
      const messageNodes = conversation.nodes
        .filter(node => node.type !== "root")
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Process nodes with new format (messages array)
      const processedNodes = [];
      
      // First pass - extract message pairs from nodes with "messages" array
      messageNodes.forEach(node => {
        if (node.messages) {
          // New format node with messages array
          const userMessage = node.messages.find(m => m.type === "user");
          const aiMessage = node.messages.find(m => m.type === "ai");
          
          if (userMessage) {
            processedNodes.push({
              id: node.id + "_user",
              type: "user",
              content: userMessage.content,
              timestamp: userMessage.timestamp || node.timestamp
            });
          }
          
          if (aiMessage) {
            processedNodes.push({
              id: node.id + "_ai",
              type: "ai",
              content: aiMessage.content,
              timestamp: aiMessage.timestamp || node.timestamp
            });
          }
        } else {
          // Legacy node format
          processedNodes.push(node);
        }
      });
      
      // Sort all processed nodes by timestamp
      processedNodes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Convert to UI messages
      processedNodes.forEach(node => {
        messagesFromConversation.push({
          text: node.content,
          sender: node.type === 'user' ? 'user' : 'ai',
          timestamp: node.timestamp
        });
      });
      
      console.log("Generated chat messages:", messagesFromConversation);
      
      // Update messages in the chat - always showing the full conversation
      setMessages(messagesFromConversation);
    } catch (error) {
      console.error("Error selecting chat node:", error);
      showToast("Failed to load conversation", null);
    }
  };

  // Handler for when new messages are sent in the chat
  const handleMessageSent = async (conversationId, node) => {
    // Refresh chat history to show new messages
    try {
      const conversations = await getConversations();
      setChatHistory(conversations || []);
    } catch (error) {
      console.error("Error refreshing chat history:", error);
    }
  };

  // Function to collapse/hide the chat pane with animation
  const collapseChat = () => {
    setIsChatCollapsing(true);
    setIsVizExpanding(true);
    
    // After animation completes, actually hide the chat
    setTimeout(() => {
      setIsChatOpen(false);
      setIsChatCollapsing(false);
      // Allow time for the visualization expansion effect
      setTimeout(() => {
        setIsVizExpanding(false);
      }, 500);
    }, 500);
  };

  // If Privy is not ready, show loading state
  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#12121A]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, show login screen
  if (!authenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#12121A]">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-6">Welcome to Data Visualization App</h1>
          <button
            onClick={login}
            className="px-6 py-3 bg-[#D4A017] text-white rounded-lg hover:bg-[#B38A14] transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden global-scrollbar-styles">
      {/* Left Pane with Tabs */}
      <div className={`flex h-full transition-all duration-300 ${isFileExplorerOpen ? 'w-60' : 'w-12'}`}>
        <div className={`h-full flex flex-col ${isFileExplorerOpen ? 'w-full bg-[#22222E]' : 'w-12 bg-[#22222E]'}`}>
          {isFileExplorerOpen ? (
            // Full Left Pane with Tabs
            <>
              {/* Tabs Navigation */}
              <div className="flex border-b border-[#1A1A24]">
                <button 
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 px-4 py-2 text-sm ${activeTab === 'files' ? 'text-white border-b-2 border-[#D4A017]' : 'text-gray-400 hover:text-white'}`}
                >
                  <div className="flex items-center justify-center">
                    <FaFolder className="w-4 h-4 mr-2" />
                    Files
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 px-4 py-2 text-sm ${activeTab === 'history' ? 'text-white border-b-2 border-[#D4A017]' : 'text-gray-400 hover:text-white'}`}
                >
                  <div className="flex items-center justify-center">
                    <FaHistory className="w-4 h-4 mr-2" />
                    History
                  </div>
                </button>
                <button 
                  onClick={() => setIsFileExplorerOpen(false)}
                  className="w-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <FaChevronLeft />
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                {activeTab === 'files' ? (
                  // File Explorer Content
                  <div className="p-4">
                    <FileExplorer 
                      fileStructure={fileStructure} 
                      onFileSelect={handleVisualizationSelect}
                      activeVisualizations={selectedVisualizations}
                    />
                  </div>
                ) : (
                  // Chat History Content
                  <div className="p-4">
                    {isLoadingHistory ? (
                      <div className="text-center text-gray-400 py-4">
                        Loading history...
                      </div>
                    ) : (
                      <ChatHistory 
                        conversations={chatHistory}
                        onNodeSelect={handleChatNodeSelect}
                        activeNodeId={activeNodeId}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Section with Subscription Status */}
              <div className="border-t border-[#1A1A24] p-4">
                <div className="flex flex-col gap-3">
                  {/* Wallet Address */}
                  <div className="text-sm text-gray-400 break-all">
                    {user?.wallet?.address ? 
                      `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 
                      'No wallet connected'}
                  </div>
                  {/* Subscription Status */}
                  {hasSubscription ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#D4A017]">
                        <FaCrown className="w-4 h-4" />
                        <span>Premium until {subscriptionExpiry?.toLocaleDateString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSubscribe}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#D4A017] text-white rounded-lg hover:bg-[#B38A14] transition-colors text-sm"
                      >
                        <FaCrown className="w-4 h-4" />
                        Subscribe Now
                      </button>
                    </div>
                  )}
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2D2D3B] text-gray-400 hover:text-white hover:bg-[#3C3C4E] rounded-lg transition-colors text-sm mt-2"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Icon Only View
            <button
              onClick={() => setIsFileExplorerOpen(true)}
              className="w-full flex flex-col items-center py-4"
            >
              <div className="text-white hover:text-[#ABA9BF] transition-colors p-2 rounded flex items-center gap-2" title="Open Explorer (Ctrl+B)">
                <FaFolder className="w-6 h-6" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-[#12121A] flex-1 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar relative z-0">
        <div className={`grid gap-5 p-5 w-full pb-20 ${
          selectedVisualizations.length === 1 
            ? 'grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-2'
        } auto-rows-fr ${isVizExpanding ? 'viz-expand' : ''}`}>
          {/* Show both active and removed (animating) visualizations */}
          {[...selectedVisualizations, ...removedVisualizations.filter(v => !selectedVisualizations.includes(v))].map((viz, index) => {
            const VisualizationComponent = visualizationComponents[viz]
            console.log('VisualizationComponent:', VisualizationComponent)
            const isNewest = viz === newestVisualization;
            const isRemoving = removingViz === viz;
            
            return VisualizationComponent ? (
              <div 
                key={viz} // Use viz as key instead of index for proper animation
                ref={isNewest ? newestVizRef : null}
                className={`bg-[#22222E] rounded-lg p-5 text-white flex flex-col ${
                  selectedVisualizations.length === 1 
                    ? 'min-h-[calc(100vh-40px)]' // Fixed height unaffected by chat pane
                    : 'min-h-[450px]'
                } ${isNewest ? 'viz-highlight newest-viz' : ''} 
                ${addingViz === viz ? 'visualization-added' : ''} 
                ${isRemoving ? 'visualization-removed' : ''} 
                new-viz-enter new-viz-enter-active relative z-10`}
              >
                {/* Visualization title showing the filename */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-400 truncate">
                    {viz}
                  </h3>
                  {viz === newestVisualization && (
                    <span className="text-xs bg-accent2 text-[#22222E] px-2 py-0.5 rounded-full animate-pulse">
                      New
                    </span>
                  )}
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 visualization-container">
                    <VisualizationComponent />
                  </div>
                </div>
              </div>
            ) : (
              <div key={index} className={`bg-[#22222E] rounded-lg p-5 text-white flex items-center justify-center ${
                selectedVisualizations.length === 1 
                  ? 'min-h-[calc(100vh-40px)]' // Fixed height unaffected by chat pane
                  : 'min-h-[400px]'
              }`}>
                Loading visualization...
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Chat Button - Only visible when chat is hidden */}
      {!isChatOpen && (
        <div 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 bg-[#2D2D3B] text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-[#3C3C4E] transition-colors z-50"
          title="Open AI Terminal (Ctrl+I)"
        >
          <FaComments className="w-5 h-5" />
        </div>
      )}

      {/* Terminal-like Chat Box - Now floating over the canvas */}
      <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[800px] bg-[#22222E] rounded-lg shadow-lg transition-all duration-300 ${
        isChatOpen ? 'h-[300px] opacity-100 chat-active' : 'h-0 opacity-0 pointer-events-none'
      } ${isChatCollapsing ? 'chat-collapse' : ''} z-50 chat-pane-overlay`}>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-full flex items-center justify-between px-4 py-2 bg-[#2D2D3B] rounded-t-lg text-white hover:bg-[#3C3C4E] transition-colors border-b border-[#1A1A24] ${
            !isChatOpen && 'hidden'
          }`}
        >
          <div className="flex items-center gap-2">
            <FaComments className="w-4 h-4" />
            <span className="font-mono text-sm">AI Terminal (Ctrl+I)</span>
          </div>
          {isChatOpen ? <FaChevronDown /> : <FaChevronUp />}
        </button>
        {isChatOpen && (
          <div className="h-[calc(300px-48px)]">
            <Chat 
              hasSubscription={hasSubscription} 
              onSubscribe={handleSubscribe}
              activeConversationId={activeConversationId}
              activeNodeId={activeNodeId}
              onMessageSent={handleMessageSent}
              messages={messages}
              setMessages={setMessages}
              refreshFileExplorer={refreshFileExplorer}
              collapseChat={collapseChat}
            />
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          txHash={toast.txHash} 
          onClose={hideToast} 
        />
      )}
    </div>
  )
}

export default App
