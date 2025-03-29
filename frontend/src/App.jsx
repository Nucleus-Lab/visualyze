import { useState, useEffect } from 'react'
import FileExplorer from './components/FileExplorer'
import Chat from './components/Chat'
import { FaFolder, FaComments, FaChevronRight, FaChevronLeft, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import * as d3 from "d3";
import React from "react";

function App() {
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedVisualizations, setSelectedVisualizations] = useState([])
  const [visualizationComponents, setVisualizationComponents] = useState({})
  const [fileStructure, setFileStructure] = useState({
    visualizations: {}
  })

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
  

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* File Explorer Pane */}
      <div className={`flex h-full transition-all duration-300 ${isFileExplorerOpen ? 'w-64' : 'w-12'}`}>
        <div className={`h-full flex ${isFileExplorerOpen ? 'w-full bg-[#22222E]' : 'w-12 bg-[#22222E]'}`}>
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
