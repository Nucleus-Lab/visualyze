import React from 'react';

// Analysis component for displaying text analysis
const Analysis = React.memo(({ 
  id,
  title,
  content,
  isNewest,
  isAdding,
  isRemoving,
  isSingle,
  refProp
}) => {
  console.log("Rendering analysis component:", id);
  
  return (
    <div 
      ref={refProp}
      id={`analysis-${id.replace(/[^a-zA-Z0-9]/g, "-")}`}
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
      {/* Analysis title */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400 truncate">
          {title}
        </h3>
        {isNewest && (
          <span className="text-xs bg-accent2 text-[#22222E] px-2 py-0.5 rounded-full animate-pulse">
            New
          </span>
        )}
      </div>
      <div className="flex-1 relative overflow-y-auto custom-scrollbar p-2 bg-[#1c1c26] rounded">
        <div className="analysis-content">
          {typeof content === 'string' 
            ? content.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))
            : JSON.stringify(content, null, 2)}
        </div>
      </div>
    </div>
  );
});

// Loading placeholder
const LoadingAnalysis = React.memo(({ title, isSingle }) => {
  return (
    <div className={`bg-[#22222E] rounded-lg p-5 text-white flex items-center justify-center ${
      isSingle 
        ? 'min-h-[calc(100vh-40px)]'
        : 'min-h-[400px]'
    }`}>
      Loading analysis: {title}...
    </div>
  );
});

export { Analysis, LoadingAnalysis }; 