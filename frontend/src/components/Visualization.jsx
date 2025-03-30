import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { saveAs } from 'file-saver'; // You'll need to install this package

// Create a VisualizationContent component that handles the actual rendering
const VisualizationContent = React.memo(({ component: VisualizationComponent, path }) => {
  console.log("Rendering visualization content:", path);
  
  // If we have a component, render it
  if (VisualizationComponent) {
    return (
      <div className="absolute inset-0 visualization-container">
        <VisualizationComponent />
      </div>
    );
  }
  
  // Otherwise show loading
  return (
    <div className="flex items-center justify-center h-full">
      Loading visualization...
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to avoid unnecessary rerenders
  // Only rerender if the component reference changes
  return prevProps.component === nextProps.component;
});

// Main Visualization container that handles all the presentation logic
const Visualization = React.memo(({ 
  path,
  component,
  displayName,
  isNewest,
  isAdding,
  isRemoving,
  isSingle,
  refProp
}) => {
  console.log("Rendering visualization container:", path);
  const svgContainerRef = useRef(null);
  
  // Generate a unique ID for this visualization based on path
  const vizId = `viz-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
  
  const handleDownload = () => {
    console.log("PNG download initiated for:", displayName);
    
    if (!svgContainerRef.current) {
      console.error("SVG container reference not found");
      return;
    }
    
    // Find the SVG element inside the container
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) {
      console.error("No SVG found in visualization");
      return;
    }

    try {
      // Get the SVG dimensions
      const svgWidth = svgElement.clientWidth || svgElement.getBoundingClientRect().width;
      const svgHeight = svgElement.clientHeight || svgElement.getBoundingClientRect().height;
      
      console.log(`SVG dimensions: ${svgWidth}x${svgHeight}`);
      
      // Create a serialized SVG string with proper XML declaration
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        ${svgData}`;
      
      // Create a Blob from the SVG data
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create a new Image object to load the SVG
      const img = new Image();
      img.onload = () => {
        // Create a canvas element with the same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth;
        canvas.height = svgHeight;
        
        // Get the canvas context and draw the image
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#22222E'; // Match background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        
        // Convert canvas to PNG and download
        canvas.toBlob((blob) => {
          // Create a clean filename from the display name
          const filename = `${displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          
          // Save the PNG file
          saveAs(blob, filename);
          console.log("PNG downloaded successfully:", filename);
          
          // Clean up
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      
      img.onerror = (error) => {
        console.error("Error loading SVG for conversion:", error);
        URL.revokeObjectURL(url);
      };
      
      // Set the image source to the SVG URL
      img.src = url;
      
    } catch (error) {
      console.error("Error converting SVG to PNG:", error);
    }
  };
  
  return (
    <div 
      ref={refProp}
      id={vizId}
      className={`bg-[#22222E] rounded-lg p-5 text-white flex flex-col ${
        isSingle 
          ? 'min-h-[calc(100vh-40px)]'
          : 'min-h-[450px]'
      } ${
        isNewest 
          ? 'viz-highlight newest-viz' 
          : ''
      } 
      ${isAdding ? 'visualization-added' : ''} 
      ${isRemoving ? 'visualization-removed' : ''} 
      new-viz-enter new-viz-enter-active relative z-10`}
    >
      {/* Visualization title showing the displayName */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400 truncate">
          {displayName}
        </h3>
        <div className="flex items-center space-x-2">
          {isNewest && (
            <span className="text-xs bg-accent2 text-[#22222E] px-2 py-0.5 rounded-full animate-pulse">
              New
            </span>
          )}
          <button 
            onClick={handleDownload}
            className="text-xs bg-blue-600 hover:bg-blue-700 transition-colors px-2 py-0.5 rounded-full flex items-center"
            title="Download as PNG"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PNG
          </button>
        </div>
      </div>
      <div className="flex-1 relative" ref={svgContainerRef}>
        <VisualizationContent component={component} path={path} />
      </div>
    </div>
  );
});

// Loading placeholder for when the component is still loading
const LoadingVisualization = React.memo(({ displayName, isSingle }) => {
  return (
    <div className={`bg-[#22222E] rounded-lg p-5 text-white flex items-center justify-center ${
      isSingle 
        ? 'min-h-[calc(100vh-40px)]'
        : 'min-h-[400px]'
    }`}>
      Loading visualization: {displayName}...
    </div>
  );
});

export { Visualization, LoadingVisualization }; 