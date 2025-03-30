import { useState, useEffect } from 'react';
import React from "react";
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';

const FileExplorer = ({ fileStructure, onFileSelect, activeVisualizations = [] }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);

  // Ensure top-level folders are expanded by default
  useEffect(() => {
    const defaultExpanded = new Set(expandedFolders);
    Object.keys(fileStructure).forEach(folder => {
      defaultExpanded.add(folder);
    });
    setExpandedFolders(defaultExpanded);
  }, [fileStructure]);

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = (path) => {
    setSelectedFile(path);
    onFileSelect(path);
  };

  const renderFileTree = (structure, path = '') => {
    return Object.entries(structure).map(([name, content]) => {
      const currentPath = path ? `${path}/${name}` : name;
      const isFolder = content !== null;
      const isExpanded = expandedFolders.has(currentPath);
      
      // Check if this file is active in visualizations
      const fileName = currentPath.split('/').pop();
      const isActive = activeVisualizations.includes(fileName);
      
      return (
        <div key={currentPath} className="w-full">
          <div 
            className={`flex items-center py-1 cursor-pointer hover:bg-[#3C93FD]/10 rounded transition-colors
              ${isFolder ? 'text-gray-100' : 'text-gray-300'}
              ${isActive ? 'bg-[#3C93FD]/20 text-[#46E4FD]' : ''}`}
            onClick={() => isFolder ? toggleFolder(currentPath) : handleFileSelect(currentPath)}
          >
            <span className="mr-1 flex-shrink-0 flex items-center">
              {isFolder ? (
                <>
                  {isExpanded ? 
                    <FaChevronDown className="w-3 h-3" /> : 
                    <FaChevronRight className="w-3 h-3" />
                  }
                  {isExpanded ? 
                    <FaFolderOpen className="w-4 h-4 ml-1" /> : 
                    <FaFolder className="w-4 h-4 ml-1" />
                  }
                </>
              ) : (
                <FaFile className={`w-4 h-4 ml-4 ${isActive ? 'text-[#46E4FD]' : ''}`} />
              )}
            </span>
            <span className="ml-1 text-sm truncate" title={name}>{name}</span>
          </div>
          {isFolder && isExpanded && (
            <div className="ml-2 w-full">
              {renderFileTree(content, currentPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="text-sm w-full overflow-hidden">
      {renderFileTree(fileStructure)}
    </div>
  );
};

export default React.memo(FileExplorer); 