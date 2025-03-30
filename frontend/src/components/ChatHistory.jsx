import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ChatHistory = ({ conversations, onNodeSelect, activeNodeId }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Update container width on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Initial measurement
    updateDimensions();
    
    // Add resize observer to handle parent container resizing
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // If no conversations yet
  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-gray-500 text-center mt-6">
        No chat history yet
      </div>
    );
  }

  // Process nodes to get conversation moments
  const processNodes = (nodes) => {
    const moments = [];
    const rootNode = nodes.find(n => n.type === "root");
    
    if (!rootNode) return moments;
    
    // Process based on node structure
    nodes.forEach(node => {
      // Skip root nodes
      if (node.type === "root") return;
      
      // Check if this is a new format node with messages
      if (node.messages) {
        const userMessage = node.messages.find(m => m.type === "user");
        if (userMessage) {
          moments.push({
            id: node.id,
            timestamp: node.timestamp,
            parentId: node.parentId,
            content: userMessage.content,
            hasAiResponse: node.messages.some(m => m.type === "ai")
          });
        }
      } 
      // For legacy nodes, only include user messages
      else if (node.type === "user") {
        // Find the corresponding AI response
        const aiResponse = nodes.find(n => n.parentId === node.id && n.type === "ai");
        
        moments.push({
          id: node.id, 
          timestamp: node.timestamp,
          parentId: node.parentId,
          content: node.content,
          hasAiResponse: !!aiResponse
        });
      }
    });
    
    // Sort moments by timestamp for proper ordering
    moments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return moments;
  };
  
  // D3 visualization for a single conversation - simplified to show only linear sequence
  const renderD3Timeline = (conversationId, moments, rootId) => {
    // Clear previous visualization
    d3.select(`#timeline-${conversationId}`).selectAll("*").remove();
    
    // Calculate dimensions - use dynamic width based on container
    const width = containerWidth - 20; // Add some padding
    const nodeRadius = 6;
    const nodeHeight = 32;
    const height = moments.length * nodeHeight;
    const lineStartX = 25;
    
    // Create SVG if it doesn't exist
    const svg = d3.select(`#timeline-${conversationId}`)
      .attr("width", width)
      .attr("height", Math.max(height, 100))
      .attr("viewBox", `0 0 ${width} ${Math.max(height, 100)}`);
    
    // Create linear scale for vertical positioning
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(moments.length - 1, 1)])
      .range([16, Math.max(height - 16, 50)]);
    
    // Draw main vertical line
    svg.append("line")
      .attr("x1", lineStartX)
      .attr("y1", 0)
      .attr("x2", lineStartX)
      .attr("y2", height > 0 ? height : 70)
      .attr("stroke", "#3C3C4E")
      .attr("stroke-width", 1);
    
    // Create a group for each moment
    const nodes = svg.selectAll(".node")
      .data(moments)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d, i) => `translate(0, ${yScale(i)})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNodeSelect(d.id, conversationId));
    
    // Add node highlight background for active node
    nodes
      .filter(d => d.id === activeNodeId)
      .append("rect")
      .attr("x", 0)
      .attr("y", -nodeHeight/2)
      .attr("width", width)
      .attr("height", nodeHeight)
      .attr("fill", "#1A1A24")
      .style("opacity", 0.5);
    
    // Add horizontal connector lines for all nodes
    nodes.append("line")
      .attr("x1", lineStartX)
      .attr("y1", 0)
      .attr("x2", lineStartX + nodeRadius + 2)
      .attr("y2", 0)
      .attr("stroke", "#3C3C4E")
      .attr("stroke-width", 1);
    
    // Add node circles
    nodes.append("circle")
      .attr("cx", lineStartX + nodeRadius)
      .attr("cy", 0)
      .attr("r", nodeRadius)
      .attr("stroke", "#3C3C4E")
      .attr("stroke-width", 1)
      .attr("fill", d => d.id === activeNodeId ? "#D4A017" : "transparent");
    
    // Add text labels with truncation based on container width
    nodes.append("text")
      .attr("x", lineStartX + nodeRadius * 2 + 10)
      .attr("y", 8)  // Small adjustment for vertical centering
      .attr("fill", d => d.id === activeNodeId ? "#FFFFFF" : "#9CA3AF")
      .style("font-size", "0.875rem")
      .text(d => {
        // Calculate available width for text
        const availableWidth = width - (lineStartX + nodeRadius * 2 + 20);
        const maxChars = Math.floor(availableWidth / 7); // Approximate chars per pixel
        
        // Truncate text if needed
        let preview = d.content.slice(0, maxChars);
        if (d.content.length > maxChars) {
          preview = preview + "...";
        }
        return preview;
      });
    
    // Add hover effect for inactive nodes
    nodes
      .filter(d => d.id !== activeNodeId)
      .append("rect")
      .attr("x", 0)
      .attr("y", -nodeHeight/2)
      .attr("width", width)
      .attr("height", nodeHeight)
      .attr("fill", "#1A1A24")
      .style("opacity", 0)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 0.2);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0);
      });
  };
  
  // Effect to render D3 visualization when data changes or container width changes
  useEffect(() => {
    if (conversations && conversations.length > 0 && containerWidth > 0) {
      conversations.forEach(conversation => {
        const moments = processNodes(conversation.nodes);
        const rootNode = conversation.nodes.find(n => n.type === "root");
        if (moments.length > 0 && rootNode) {
          renderD3Timeline(conversation.id, moments, rootNode.id);
        }
      });
    }
  }, [conversations, activeNodeId, containerWidth]);
  
  return (
    <div className="chat-history custom-scrollbar" ref={containerRef}>
      {conversations.map(conversation => {
        const moments = processNodes(conversation.nodes);
        
        return (
          <div key={conversation.id} className="mb-6 w-full">
            {/* D3.js timeline visualization */}
            <div className="d3-timeline-container w-full">
              <svg id={`timeline-${conversation.id}`} className="w-full"></svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatHistory; 