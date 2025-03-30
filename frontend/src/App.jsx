import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import FileExplorer from './components/FileExplorer'
import Chat from './components/Chat'
import Toast from './components/Toast'
import ChatHistory from './components/ChatHistory'
import { FaFolder, FaComments, FaChevronRight, FaChevronLeft, FaChevronDown, FaChevronUp, FaCrown, FaToggleOn, FaSignOutAlt, FaHistory, FaGripLinesVertical } from 'react-icons/fa'
import { usePrivy, useWallets, useLogout } from '@privy-io/react-auth'
import * as d3 from "d3";
import React from "react";
import { checkSubscription, subscribe } from './utils/contract';
import { getConversations, getConversation, createConversation, getNodeBranch } from './utils/chatHistoryService';
import { Visualization, LoadingVisualization } from './components/Visualization';

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
  const [leftPaneWidth, setLeftPaneWidth] = useState(240) // Default width in pixels
  const [isDragging, setIsDragging] = useState(false)
  const [isAtMinWidth, setIsAtMinWidth] = useState(false)
  const [isAtMaxWidth, setIsAtMaxWidth] = useState(false)
  const minLeftPaneWidth = 180 // Minimum width for the left pane
  const maxLeftPaneWidth = 400 // Maximum width for the left pane
  const [chatPaneWidth, setChatPaneWidth] = useState(800) // Default chat pane width
  const [isChatDragging, setIsChatDragging] = useState(false)
  const [isChatAtMinWidth, setIsChatAtMinWidth] = useState(false)
  const [isChatAtMaxWidth, setIsChatAtMaxWidth] = useState(false)
  const minChatPaneWidth = 500 // Minimum chat pane width
  const maxChatPaneWidth = 1200 // Maximum chat pane width
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
  // Reference to the Chat component for focus management
  const chatComponentRef = useRef(null);

  // State to track animations for visualizations
  const [removingViz, setRemovingViz] = useState(null);
  const [addingViz, setAddingViz] = useState(null);

  // State to track recently removed visualizations for animation
  const [removedVisualizations, setRemovedVisualizations] = useState([]);

  // Helper function to load a visualization component - moved inside the component
  const loadVisualizationComponent = useCallback(async (filePath, retries = 3, delay = 500) => {
    if (!visualizationComponents[filePath]) {
      try {
        console.log("Loading visualization:", filePath);
        
        let response;
        let retryCount = 0;
        
        // Try multiple times with increasing delays
        while (retryCount <= retries) {
          try {
            response = await fetch(`http://localhost:8000/api/visualizations/${filePath}`);
            
            if (response.ok) {
              break; // Success, exit the retry loop
    } else {
              console.log(`Attempt ${retryCount+1}/${retries+1} failed, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              delay *= 1.5; // Increase delay for next retry
            }
          } catch (fetchError) {
            console.error("Fetch error:", fetchError);
            if (retryCount >= retries) throw fetchError;
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
          }
        }
        
        if (!response.ok) {
          throw new Error(`Failed to load visualization: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Fetched JS Code length:", data.content.length);

        // Dynamically evaluate the JS code received
        const RawComponent = new Function("React", "d3", `
          ${data.content}
          return GeneratedViz;  // Return the component directly
        `)(React, d3);

        // Wrap in a memo to prevent unnecessary re-renders
        const MemoizedComponent = React.memo(RawComponent);

        // Store the memoized component in state
        setVisualizationComponents(prev => ({
          ...prev,
          [filePath]: MemoizedComponent,
        }));

        console.log("Successfully loaded visualization component:", filePath);
      } catch (error) {
        console.error("Error loading visualization:", filePath, error);
      }
    }
  }, [visualizationComponents]);

  // Add this effect to clear content when user changes
  useEffect(() => {
    if (user?.wallet?.address) {
      // Clear file explorer and canvas when user changes
      setFileStructure({ visualizations: {} });
      setSelectedVisualizations([]);
      setVisualizationComponents({});
      console.log("Cleared content for new user:", user.wallet.address);
    }
  }, [user?.wallet?.address]); // This will trigger when the wallet address changes

  // Function to refresh file explorer when new visualizations are created
  const refreshFileExplorer = useCallback(async (highlightFiles = null) => {
    console.log("Starting refreshFileExplorer with:", highlightFiles);
    try {
      // Get wallet address
      const walletAddress = user?.wallet?.address || 'anonymous';
      
      // Fetch user-specific visualization files
      const userResponse = await fetch(`http://localhost:8000/api/visualizations/${walletAddress}`);
      const userData = await userResponse.json();
      
      // Fetch template visualizations
      const templatesResponse = await fetch(`http://localhost:8000/api/visualizations/templates`);
      const templatesData = await templatesResponse.json();
      
      // Create file structure and prepare for component loading
      const newFileStructure = {
        visualizations: {}
      };
      
      // Add user's visualization files with a prefix to distinguish them
      userData.files.forEach(fileName => {
        newFileStructure.visualizations[`(My) ${fileName}`] = null;
      });
      
      // Add template visualization files
      templatesData.files.forEach(fileName => {
        newFileStructure.visualizations[`(Template) ${fileName}`] = null;
      });
      
      console.log("Setting file structure and handling highlights");
      // Batch these updates together by using a function to update the state
      setFileStructure(newFileStructure);
      
      // Automatically open the file explorer if closed
      if (!isFileExplorerOpen) {
        setIsFileExplorerOpen(true);
      }
      
      // Create an array of files to highlight (if not already an array)
      const filesToHighlight = Array.isArray(highlightFiles) ? highlightFiles : 
                              (highlightFiles ? [highlightFiles] : []);
      
      // Process each file to highlight
      if (filesToHighlight.length > 0) {
        console.log('Highlighting files:', filesToHighlight);
        
        // Track all new visualizations to be added
        const newVisualizations = [];
        
        // Load all visualization components first, then update state once
        const loadPromises = [];
        
        for (const highlightFile of filesToHighlight) {
          // Extract the filename from the path
          const pathParts = highlightFile.split('/');
          const userAddress = pathParts.length > 1 ? pathParts[0] : '';
          const fileName = pathParts.length > 1 ? pathParts[1] : pathParts[0];
          
          // Add to selected visualizations if not already included
          if (!selectedVisualizations.includes(highlightFile)) {
            newVisualizations.push(highlightFile);
            
            // Queue up loading of visualization component
            loadPromises.push(loadVisualizationComponent(highlightFile));
          }
        }
        
        // Wait for all visualization components to start loading
        await Promise.all(loadPromises);
        
        // Update selected visualizations with all new ones in a single update
        if (newVisualizations.length > 0) {
          console.log("Setting newest visualization and updating selected");
          setSelectedVisualizations(prev => [...prev, ...newVisualizations]);
          setNewestVisualization(newVisualizations);
          
          // Clear the highlight after 4 seconds
          setTimeout(() => {
            setNewestVisualization(null);
          }, 4000);
        }
      }
    } catch (error) {
      console.error('Error refreshing visualization files:', error);
      showToast("Failed to refresh file explorer", null);
    }
  }, [user?.wallet?.address, isFileExplorerOpen, selectedVisualizations, loadVisualizationComponent]);

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
        // Focus the chat input when opening
        if (!isChatOpen) {
          // Use setTimeout to ensure the chat pane is visible before focusing
          setTimeout(() => {
            chatComponentRef.current?.focusInput();
          }, 10);
        }
      }
      // Check for Ctrl+B (keyCode 66 for 'B')
      if (e.ctrlKey && e.keyCode === 66) {
        e.preventDefault(); // Prevent default browser behavior
        setIsFileExplorerOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isChatOpen]);

  // Effect to check subscription status when user is authenticated
  useEffect(() => {
    const checkUserSubscription = async () => {
      // Clear any existing visualizations first
      setFileStructure({ visualizations: {} });
      setSelectedVisualizations([]);
      setVisualizationComponents({});
      
      if (authenticated && user?.wallet?.address && wallets.length > 0) {
        try {
          console.log("Checking subscription status for user");
          const subscription = await checkSubscription(user.wallet.address, wallets[0]);
          setHasSubscription(subscription.hasSubscription);
          setSubscriptionExpiry(subscription.expiryDate);
          console.log("Subscription status updated:", subscription);
          
          // Only refresh files if the user has a subscription
          if (subscription.hasSubscription) {
            refreshFileExplorer();
          }
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
    console.log("Selected visualization path:", path);
    
    // Extract filename from path
    const fileName = path.split("/").pop();
  
    // Determine if this is a user visualization or template based on prefix
    const isUserViz = fileName.startsWith("(My)");
    const isTemplateViz = fileName.startsWith("(Template)");
    
    // Get the actual filename without prefix
    const actualFileName = isUserViz || isTemplateViz
      ? fileName.split(") ")[1] // Remove the prefix
      : fileName;
    
    // Build the correct backend path
    let backendPath;
    
    if (isUserViz) {
      // User visualization - needs wallet address
      const walletAddress = user?.wallet?.address || 'anonymous';
      const sanitizedAddress = walletAddress.replace('0x', '').toLowerCase();
      backendPath = `${sanitizedAddress}/${actualFileName}`;
    } else if (isTemplateViz) {
      // Template visualization
      backendPath = `templates/${actualFileName}`;
    } else {
      // Legacy path handling
      backendPath = fileName;
    }
  
    if (selectedVisualizations.includes(backendPath)) {
      // Mark this visualization as removing for animation
      setRemovingViz(backendPath);
      // Add to removed list to keep it around during animation
      setRemovedVisualizations(prev => [...prev, backendPath]);
      
      // Deselect visualization
      setSelectedVisualizations((prev) => prev.filter((viz) => viz !== backendPath));
      setRemovingViz(null);
      
      // Remove from the removed list after animation completes 
      setRemovedVisualizations(prev => prev.filter(v => v !== backendPath));
    } else {
      // Select visualization
      setSelectedVisualizations((prev) => [...prev, backendPath]);
      setAddingViz(backendPath);
      
      // Load the visualization component
      await loadVisualizationComponent(backendPath);
      
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
    console.log("setting chat to collapse...")
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

  // Update the chat open handler to focus input when opening
  const handleChatOpen = () => {
    setIsChatOpen(true);
    // Use setTimeout to ensure the chat pane is visible before focusing
    setTimeout(() => {
      chatComponentRef.current?.focusInput();
    }, 10);
  };

  // Add resize functionality
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Capture initial mouse position and pane width
    const startX = e.clientX;
    const startWidth = leftPaneWidth;
    
    const handleMouseMove = (mouseMoveEvent) => {
      mouseMoveEvent.preventDefault();
      
      // Calculate new width based on mouse movement
      let newWidth = startWidth + (mouseMoveEvent.clientX - startX);
      
      // Check if at min or max boundaries before clamping
      setIsAtMinWidth(newWidth <= minLeftPaneWidth);
      setIsAtMaxWidth(newWidth >= maxLeftPaneWidth);
      
      // Apply min/max constraints after calculating the drag distance
      newWidth = Math.min(Math.max(newWidth, minLeftPaneWidth), maxLeftPaneWidth);
      
      // Update pane width
      setLeftPaneWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Keep the handle visible briefly after releasing
      setTimeout(() => {
        setIsDragging(false);
      }, 100);
      
      // Reset boundary states after 1 second
      setTimeout(() => {
        setIsAtMinWidth(false);
        setIsAtMaxWidth(false);
      }, 1000);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Add resize functionality for chat pane
  const handleChatResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsChatDragging(true);
    
    // Capture initial mouse position and pane width
    const startX = e.clientX;
    const startWidth = chatPaneWidth;
    
    const handleMouseMove = (mouseMoveEvent) => {
      mouseMoveEvent.preventDefault();
      
      // Calculate width change
      const dx = mouseMoveEvent.clientX - startX;
      
      // Resize from both sides - pull left or right
      let newWidth = startWidth + dx * 2;
      
      // Check if at min or max boundaries before clamping
      setIsChatAtMinWidth(newWidth <= minChatPaneWidth);
      setIsChatAtMaxWidth(newWidth >= maxChatPaneWidth);
      
      // Apply min/max constraints
      newWidth = Math.min(Math.max(newWidth, minChatPaneWidth), maxChatPaneWidth);
      
      // Update chat pane width
      setChatPaneWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsChatDragging(false);
      
      // Reset boundary states after 1 second
      setTimeout(() => {
        setIsChatAtMinWidth(false);
        setIsChatAtMaxWidth(false);
      }, 1000);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Update CSS variable when chat width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--chat-width', `${chatPaneWidth}px`);
  }, [chatPaneWidth]);

  // Handler for the Chat component to send messages to AI
  const handleChatMessage = useCallback(async (message) => {
    console.log("Handling chat message:", message.slice(0, 20) + "...");
    try {
      // Call the AI processing endpoint
      const response = await fetch('http://localhost:8000/api/process-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: message,
          conversationId: activeConversationId,
          nodeId: activeNodeId,
          walletAddress: user?.wallet?.address || 'anonymous'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process prompt');
      }
      
      console.log("Process-prompt response received:", data);
      
      // Refresh file explorer to show new visualizations (now passing the entire array)
      await refreshFileExplorer(data.filenames);
      
      return data;
    } catch (error) {
      console.error("Error processing chat message:", error);
      throw error;
    }
  }, [activeConversationId, activeNodeId, refreshFileExplorer, user?.wallet?.address]);

  // Helper function to get display name - moved from inline to a separate function
  const getDisplayName = useCallback((path) => {
    if (!path) return "";
    
    const parts = path.split('/');
    if (parts.length > 1) {
      // Path with user address
      const fileName = parts[parts.length - 1];
      const userAddress = parts[0];
      
      // Check if this is the current user's visualization
      const currentWalletAddress = user?.wallet?.address || 'anonymous';
      const currentUserAddress = currentWalletAddress.replace('0x', '').toLowerCase();
      
      if (userAddress === currentUserAddress) {
        return `${fileName}`;
      } else if (userAddress === 'templates') {
        return `(Template) ${fileName}`;
      } else {
        return fileName;
      }
    } else {
      // Just a filename
      return path;
    }
  }, [user?.wallet?.address]);

  // Use useMemo to compute the list of visualizations to render
  const visualizationsToRender = useMemo(() => {
    return [...selectedVisualizations, ...removedVisualizations.filter(v => !selectedVisualizations.includes(v))];
  }, [selectedVisualizations, removedVisualizations]);

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
      {/* Left Pane Container with Tabs and Resize Handle */}
      <div className="flex h-full">
        {/* Left Pane Content */}
        <div className={`${isFileExplorerOpen ? 'left-pane' : 'w-12'} ${isDragging ? 'dragging' : 'transition-all duration-300'}`} 
             style={{ width: isFileExplorerOpen ? `${leftPaneWidth}px` : '48px' }}>
        <div className={`h-full flex flex-col ${isFileExplorerOpen ? 'w-full bg-[#22222E]' : 'w-12 bg-[#22222E]'}`}>
            
            {/* Add Logo and App Name at the top - aligned to the left with proper logo handling */}
            <div className={`flex items-center border-b border-[#1A1A24] p-2 ${isFileExplorerOpen ? 'justify-start pl-4' : 'justify-center'}`}>
              <div className={`${isFileExplorerOpen ? '' : 'w-full flex justify-center'}`}>
                <img 
                  src="/logo.png" 
                  alt="Visualyze Logo" 
                  className={`${isFileExplorerOpen ? 'h-8 w-8 mr-2' : 'h-6 w-6'} object-contain`} 
                />
              </div>
              {isFileExplorerOpen && <span className="text-white font-semibold text-lg">Visualyze</span>}
            </div>
            
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
        
        {/* Resize Handle */}
        <div 
          className={`resize-handle h-full relative z-20 group 
            ${isDragging ? 'bg-[#D4A017]' : 'bg-[#1A1A24] hover:bg-[#D4A017]'}
            ${isAtMinWidth ? 'min-width-indicator' : ''}
            ${isAtMaxWidth ? 'max-width-indicator' : ''}
            ${!isFileExplorerOpen ? 'hidden' : ''}`}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 text-[#D4A017]">
            <FaGripLinesVertical />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-[#12121A] flex-1 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar relative z-0">
        <div className={`grid gap-5 p-5 w-full pb-20 ${
          selectedVisualizations.length === 1 
            ? 'grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-2'
        } auto-rows-fr ${isVizExpanding ? 'viz-expand' : ''}`}>
          {visualizationsToRender.map((vizPath, index) => {
            const VisualizationComponent = visualizationComponents[vizPath];
            const isNewest = Array.isArray(newestVisualization) && newestVisualization.includes(vizPath);
            const isRemoving = removingViz === vizPath;
            const isAdding = addingViz === vizPath;
            const displayName = getDisplayName(vizPath);
            const isSingle = selectedVisualizations.length === 1;
            
            // Only log once per render cycle
            console.log('Rendering visualization:', vizPath, 'Component exists:', !!VisualizationComponent);
            
            return VisualizationComponent ? (
              <Visualization
                key={vizPath}
                path={vizPath}
                component={VisualizationComponent}
                displayName={displayName}
                isNewest={isNewest}
                isAdding={isAdding}
                isRemoving={isRemoving}
                isSingle={isSingle}
                refProp={isNewest ? newestVizRef : null}
              />
            ) : (
              <LoadingVisualization 
                key={vizPath} 
                displayName={displayName}
                isSingle={isSingle}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Chat Button - Only visible when chat is hidden */}
      {!isChatOpen && (
        <div 
          onClick={handleChatOpen}
          className="fixed bottom-4 right-4 bg-[#2D2D3B] text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-[#3C3C4E] transition-colors z-50"
          title="Open AI Terminal (Ctrl+I)"
        >
          <FaComments className="w-5 h-5" />
        </div>
      )}

      {/* Terminal-like Chat Box - Now floating over the canvas */}
      <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#22222E] rounded-lg shadow-lg chat-pane-overlay ${
        isChatOpen ? 'h-[300px] opacity-100 chat-active' : 'h-0 opacity-0 pointer-events-none'
      } ${isChatCollapsing ? 'chat-collapse' : ''} ${isChatDragging ? 'dragging' : ''}`}
        style={{ width: `${chatPaneWidth}px` }}>
        
        {/* Drag handle at top of chat box */}
        <div 
          className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-5 cursor-move rounded-t-md flex items-center justify-center group
            ${isChatDragging ? 'bg-[#D4A017]' : 'bg-[#2D2D3B]'}
            ${isChatAtMinWidth ? 'chat-min-width-indicator' : ''}
            ${isChatAtMaxWidth ? 'chat-max-width-indicator' : ''}`}
          onMouseDown={handleChatResizeStart}
        >
          <div className="w-8 h-1 bg-[#1A1A24] rounded-full group-hover:bg-[#D4A017]"></div>
        </div>
        
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
              ref={chatComponentRef}
              hasSubscription={hasSubscription} 
              onSubscribe={handleSubscribe}
              activeConversationId={activeConversationId}
              activeNodeId={activeNodeId}
              onMessageSent={handleMessageSent}
              messages={messages}
              setMessages={setMessages}
              refreshFileExplorer={refreshFileExplorer}
              collapseChat={collapseChat}
              handleChatMessage={handleChatMessage}
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

      {/* Overlay when dragging to improve UX */}
      {(isDragging || isChatDragging) && (
        <div className="dragging-overlay" />
      )}
    </div>
  )
}

export default App
