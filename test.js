const d3js_file_path = "C:/Users/wongx/Documents/NucleusLab/ethglobal taipei 2025/chat-database/agents/temp/ethereum_daily_price_last_7_days.js";
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

// Get the current file's directory (required for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Create HTML with React setup
const html_template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>D3.js Visualization</title>
    <!-- React dependencies -->
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; background-color: #1a1a1a; }
        #root {
            width: 800px;
            height: 500px;
        }
        .w-full { width: 100%; }
        .h-full { height: 100%; }
        .bg-[#22222E] { background-color: #22222E; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="/d3-script"></script>
    <script>
        // Render the React component
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(GeneratedViz));
    </script>
</body>
</html>
`;

// Main function to run the headless capture
async function captureVisualizationHeadless() {
    let server;
    let browser;
    
    try {
        console.log('Starting local server to serve the D3.js file...');
        
        // Serve the D3.js script
        app.get('/d3-script', (req, res) => {
            console.log('Serving D3.js script...');
            fs.readFile(d3js_file_path, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading D3.js file:', err);
                    res.status(500).send('Error loading D3.js script');
                    return;
                }
                
                res.setHeader('Content-Type', 'application/javascript');
                res.send(data);
            });
        });
        
        // Serve the HTML template
        app.get('/', (req, res) => {
            res.send(html_template);
        });
        
        // Start the server
        server = app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
        
        // Launch headless browser
        console.log('Launching headless browser...');
        browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        console.log('Navigating to visualization page...');
        
        // Navigate to our local server
        await page.goto(`http://localhost:${port}`, {
            waitUntil: 'networkidle0', // Wait until network is idle
            timeout: 30000 // 30 second timeout
        });
        
        // Wait for D3 to render
        console.log('Waiting for D3.js to render visualization...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if an SVG was created
        const svgExists = await page.evaluate(() => {
            const svgs = document.querySelectorAll('svg');
            return svgs.length > 0;
        });
        
        if (!svgExists) {
            throw new Error('No SVG element found. D3.js visualization may not have rendered properly.');
        }
        
        // Get the SVG dimensions for proper screenshot
        const svgDimensions = await page.evaluate(() => {
            const svg = document.querySelector('svg');
            const rect = svg.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        });
        
        console.log('SVG dimensions:', svgDimensions);
        
        // Create output directory if it doesn't exist
        const outputDir = './output';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        // Take screenshot of just the visualization
        const outputPath = path.join(outputDir, 'ethereum_price_visualization.png');
        console.log(`Taking screenshot and saving to ${outputPath}...`);
        
        await page.screenshot({
            path: outputPath,
            clip: {
                x: svgDimensions.x,
                y: svgDimensions.y,
                width: svgDimensions.width,
                height: svgDimensions.height
            },
            omitBackground: true // Transparent background
        });
        
        console.log('Screenshot saved successfully!');
        
    } catch (error) {
        console.error('Error in headless capture:', error);
    } finally {
        // Clean up
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
        
        if (server) {
            console.log('Shutting down server...');
            server.close();
        }
    }
}

// Run the headless capture
captureVisualizationHeadless();




