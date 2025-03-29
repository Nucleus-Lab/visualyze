import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Visualization = ({ code, data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll('*').remove();

    try {
      // Create a safe function execution environment
      const executeVisualization = new Function('d3', 'container', 'data', code);
      
      // Execute the visualization code
      executeVisualization(d3, containerRef.current, data);

      // Ensure SVG fills container
      const svg = d3.select(containerRef.current).select('svg');
      if (svg.size() > 0) {
        svg
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('preserveAspectRatio', 'xMidYMid meet');
      }
    } catch (error) {
      console.error('Error executing visualization:', error);
      
      // Display error message in the container
      d3.select(containerRef.current)
        .append('div')
        .attr('class', 'text-red-500 p-4')
        .text(`Error: ${error.message}`);
    }
  }, [code, data]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div 
        ref={containerRef} 
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
};

export default Visualization; 