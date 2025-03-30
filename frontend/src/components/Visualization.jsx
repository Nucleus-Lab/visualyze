import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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
  
  return (
    <div 
      ref={refProp}
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
        {isNewest && (
          <span className="text-xs bg-accent2 text-[#22222E] px-2 py-0.5 rounded-full animate-pulse">
            New
          </span>
        )}
      </div>
      <div className="flex-1 relative">
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