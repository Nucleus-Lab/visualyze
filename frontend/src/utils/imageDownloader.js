import { saveAs } from 'file-saver';

/**
 * Downloads an SVG visualization as a PNG image
 * @param {string} svgContainerSelector - CSS selector to find the SVG container
 * @param {string} displayName - Display name for the visualization (used for filename)
 * @param {boolean} saveToServer - Whether to also save the image to the server
 * @returns {Promise<string|null>} - URL of the saved image or null if failed
 */
export const downloadVisualizationImage = async (svgContainerSelector, displayName, saveToServer = true) => {
  try {
    console.log("Attempting to download visualization:", displayName);
    
    // Find the container element
    const svgContainer = document.querySelector(svgContainerSelector);
    if (!svgContainer) {
      console.error("SVG container not found:", svgContainerSelector);
      return null;
    }
    
    // Find the SVG element inside the container
    const svgElement = svgContainer.querySelector('svg');
    if (!svgElement) {
      console.error("No SVG found in visualization container");
      return null;
    }

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
    
    // Create a clean filename from the display name
    const filename = `${displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    
    return new Promise((resolve, reject) => {
      let serverResponse;
      // Create a new Image object to load the SVG
      const img = new Image();
      
      img.onload = async () => {
        // Create a canvas element with the same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth;
        canvas.height = svgHeight;
        
        // Get the canvas context and draw the image
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#22222E'; // Match background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        
        // Convert canvas to PNG blob
        
        canvas.toBlob(async (blob) => {
          try {
            // If saving to server is enabled
            if (saveToServer) {
              const formData = new FormData();
              formData.append('file', blob, filename);
              
              // Send the image to the server
              const response = await fetch('http://localhost:8000/api/save-visualization-image', {
                method: 'POST',
                body: formData
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error("Error saving image to server:", errorData);
                reject(new Error("Failed to save image to server"));
              } else {
                const result = await response.json();
                console.log("Image saved to server:", result.filepath);
                serverResponse = result.filepath;
                resolve(result.filepath);
              }
            } else {
              resolve(filename);
            }
            
            // For local download (optional)
            // saveAs(blob, filename);
            
            // Clean up
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error in image processing:", error);
            URL.revokeObjectURL(url);
            reject(error);
          }
        }, 'image/png');
      };
      
      img.onerror = (error) => {
        console.error("Error loading SVG for conversion:", error);
        URL.revokeObjectURL(url);
        reject(error);
      };
      
      // Set the image source to the SVG URL
      img.src = url;
      return serverResponse;
    });
  } catch (error) {
    console.error("Error downloading visualization:", error);
    return null;
  }
}; 