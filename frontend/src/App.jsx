import { useState, useEffect } from 'react'
import FileExplorer from './components/FileExplorer'
import Chat from './components/Chat'
import { FaFolder, FaComments, FaChevronRight, FaChevronLeft, FaChevronDown, FaChevronUp, FaCrown, FaToggleOn, FaSignOutAlt } from 'react-icons/fa'
import { usePrivy, useWallets, useLogout } from '@privy-io/react-auth'
import * as d3 from "d3";
import React from "react";
import { checkSubscription, subscribe } from './utils/contract';

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
  const [fileStructure, setFileStructure] = useState({
    visualizations: {}
  })
  // Mock subscription state - will be replaced with actual contract interaction
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null)

  // Temporary function to toggle subscription state
  const toggleSubscription = () => {
    setHasSubscription(prev => !prev);
    if (!hasSubscription) {
      // Set expiry to 30 days from now when subscribing
      setSubscriptionExpiry(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } else {
      setSubscriptionExpiry(null);
    }
  };

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
    const loadVisualizationFiles = async () => {
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
        console.log('Found visualization files:', data.files)
      } catch (error) {
        console.error('Error loading visualization files:', error)
      }
    }

    loadVisualizationFiles()
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

  const handleVisualizationSelect = async (path) => {
    console.log("Selected visualization:", path);
    const fileName = path.split("/").pop();
  
    if (selectedVisualizations.includes(fileName)) {
      setSelectedVisualizations((prev) => prev.filter((viz) => viz !== fileName));
    } else {
      setSelectedVisualizations((prev) => [...prev, fileName]);
  
      if (!visualizationComponents[fileName]) {
        try {
          // Fetch JS code from backend
          const response = await fetch(`http://localhost:8000/api/visualizations/${fileName}`);
          const data = await response.json();
  
          console.log("Fetched JS Code:", data.content);
  
          // Dynamically evaluate the JS code received
          const component = new Function("React", "d3", `
            ${data.content}
            return GeneratedViz;  // Return the component directly
          `)(React, d3);
  
          // Store the evaluated component in state
          setVisualizationComponents((prev) => ({
            ...prev,
            [fileName]: component,
          }));
  
          console.log("Loaded Visualization Component:", fileName);
        } catch (error) {
          console.error("Error loading visualization:", fileName, error);
        }
      }
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
      await subscribe(wallets[0]);
      
      // Check updated subscription status
      const subscription = await checkSubscription(user.wallet.address, wallets[0]);
      setHasSubscription(subscription.hasSubscription);
      setSubscriptionExpiry(subscription.expiryDate);
      console.log("Subscription completed successfully");
    } catch (error) {
      console.error('Error subscribing:', error);
      // You might want to show an error message to the user here
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
            Login with Privy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* File Explorer Pane */}
      <div className={`flex h-full transition-all duration-300 ${isFileExplorerOpen ? 'w-60' : 'w-12'}`}>
        <div className={`h-full flex flex-col ${isFileExplorerOpen ? 'w-full bg-[#22222E]' : 'w-12 bg-[#22222E]'}`}>
          {isFileExplorerOpen ? (
            // Full File Explorer
            <>
              <div className="relative flex-1">
                <button 
                  onClick={() => setIsFileExplorerOpen(false)}
                  className="absolute top-5 right-1 w-6 h-6 bg-[#22222E] text-white border-none cursor-pointer flex items-center justify-center rounded z-20"
                >
                  <FaChevronLeft />
                </button>
                <div className="p-4">
                  <h2 className="text-lg text-white font-medium mb-4">File Explorer (Ctrl+B)</h2>
                  <FileExplorer 
                    fileStructure={fileStructure} 
                    onFileSelect={handleVisualizationSelect}
                  />
                </div>
              </div>
              {/* Subscription Status and Button */}
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
                      <button
                        onClick={toggleSubscription}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                        title="Toggle subscription state (temporary)"
                      >
                        <FaToggleOn className="w-4 h-4" />
                      </button>
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
                      <button
                        onClick={toggleSubscription}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                        title="Toggle subscription state (temporary)"
                      >
                        <FaToggleOn className="w-4 h-4" />
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
            // Icon Only
            <button
              onClick={() => setIsFileExplorerOpen(true)}
              className="w-full flex flex-col items-center py-4"
            >
              <div className="text-white hover:text-[#ABA9BF] transition-colors p-2 rounded flex items-center gap-2" title="Open File Explorer (Ctrl+B)">
                <FaFolder className="w-6 h-6" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-[#12121A] flex-1 h-screen overflow-y-auto overflow-x-hidden relative">
        <div className={`grid gap-5 p-5 w-full ${
          selectedVisualizations.length === 1 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2'
        } auto-rows-fr`}>
          {selectedVisualizations.map((viz, index) => {
            const VisualizationComponent = visualizationComponents[viz]
            console.log('VisualizationComponent:', VisualizationComponent)
            return VisualizationComponent ? (
              <div 
                key={index} 
                className={`bg-[#22222E] rounded-lg p-5 text-white flex flex-col ${
                  selectedVisualizations.length === 1 
                    ? 'min-h-[calc(100vh-40px)]' // Full height minus padding
                    : 'min-h-[400px]'
                }`}
              >
                {/* filename of the visualization TODO: where to add the filename so that it looks nice but able to refer to */}
                {/* <h3 className="text-lg font-medium mb-4">{viz}</h3> */}
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <VisualizationComponent />
                  </div>
                </div>
              </div>
            ) : (
              <div key={index} className={`bg-[#22222E] rounded-lg p-5 text-white flex items-center justify-center ${
                selectedVisualizations.length === 1 
                  ? 'min-h-[calc(100vh-40px)]' 
                  : 'min-h-[400px]'
              }`}>
                Loading visualization...
              </div>
            )
          })}
        </div>

        {/* Terminal-like Chat Box */}
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[800px] bg-[#22222E] rounded-lg shadow-lg transition-all duration-300 ${
          isChatOpen ? 'h-[300px]' : 'h-12'
        }`}>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-full flex items-center justify-between px-4 py-2 bg-[#2D2D3B] rounded-t-lg text-white hover:bg-[#3C3C4E] transition-colors border-b border-[#1A1A24]"
          >
            <div className="flex items-center gap-2">
              <FaComments className="w-4 h-4" />
              <span className="font-mono text-sm">AI Terminal (Ctrl+I)</span>
            </div>
            {isChatOpen ? <FaChevronDown /> : <FaChevronUp />}
          </button>
          {isChatOpen && (
            <div className="h-[calc(300px-48px)]">
              <Chat />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
