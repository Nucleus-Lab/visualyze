from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from typing import Dict, Any, List, Optional
from database.chat_history import (
    get_all_conversations, 
    get_conversation,
    create_conversation, 
    add_message_node,
    add_conversation_node,
    update_node_with_ai_response,
    get_branch
)
import uuid
from datetime import datetime
import random
import shutil
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define base visualization directory and user-specific paths
VISUALIZATIONS_DIR = "../frontend/src/components/visualizations"
TEMPLATES_DIR = os.path.join(VISUALIZATIONS_DIR, "templates")
os.makedirs(VISUALIZATIONS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Helper function to get or create user directory
def get_user_dir(wallet_address):
    """Create a user-specific directory based on wallet address and return the path"""
    # Sanitize wallet address for use as directory name
    sanitized_address = wallet_address.replace('0x', '').lower()
    
    # Create user directory
    user_dir = os.path.join(VISUALIZATIONS_DIR, sanitized_address)
    os.makedirs(user_dir, exist_ok=True)
    
    logger.info(f"Using user directory: {user_dir}")
    return user_dir

# Copy sample templates to templates directory if it's empty
def ensure_template_files_exist():
    """Ensure that at least one template file exists in the templates directory"""
    if not os.path.exists(TEMPLATES_DIR):
        os.makedirs(TEMPLATES_DIR, exist_ok=True)
        
    # Check if templates directory is empty
    template_files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.js')]
    if not template_files:
        logger.info("No template files found. Creating sample templates...")
        
        # Create a simple template visualization
        sample_template = """
// Sample Visualization Template
const GeneratedViz = () => {
  // Set up dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 50, right: 50, bottom: 70, left: 80 };
  const titleText = "Web3 DeFi Transactions Over Time";
  
  // Set up the D3 visualization
  React.useEffect(() => {
    // Clear previous SVG
    d3.select("#chart").selectAll("*").remove();
    
    // Create the SVG
    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Generate some sample data
    const data = Array.from({ length: 20 }, (_, i) => ({
      date: new Date(2023, 0, i + 1),
      value: Math.random() * 1000
    }));
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width - margin.left - margin.right]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height - margin.top - margin.bottom, 0]);
    
    // Add X-axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    // Add Y-axis
    svg.append("g")
      .call(d3.axisLeft(yScale));
    
    // Add X-axis label
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", height - margin.top - margin.bottom + 50)
      .style("text-anchor", "middle")
      .text("Date");
    
    // Add Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("y", -60)
      .style("text-anchor", "middle")
      .text("Transaction Volume");
    
    // Add title
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -20)
      .style("text-anchor", "middle")
      .style("font-size", "18px")
      .text(titleText);
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // Add the line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#46E4FD")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add circles for data points
    svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.value))
      .attr("r", 5)
      .attr("fill", "#D4A017");
    
  }, []);
  
  return (
    <div id="chart" className="w-full h-full"></div>
  );
};
"""
        
        # Save the sample template
        with open(os.path.join(TEMPLATES_DIR, "sample_template.js"), "w", encoding="utf-8") as f:
            f.write(sample_template)
            
        logger.info("Created sample template visualization")

# Ensure templates exist at application startup
ensure_template_files_exist()

@app.get("/api/visualizations")
async def list_visualizations():
    """List all visualization files available in the visualizations directory."""
    try:
        logger.info("Fetching list of all visualization files")
        
        # Get all files from all user directories
        all_files = []
        for root, dirs, files in os.walk(VISUALIZATIONS_DIR):
            for file in files:
                if file.endswith('.js'):
                    # Get relative path from VISUALIZATIONS_DIR
                    rel_path = os.path.relpath(os.path.join(root, file), VISUALIZATIONS_DIR)
                    all_files.append(rel_path)
        
        logger.info(f"Found {len(all_files)} visualization files")
        return {"files": all_files}
    except Exception as e:
        logger.error(f"Error listing visualizations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visualizations/{wallet_address}")
async def list_user_visualizations(wallet_address: str):
    """List visualization files for a specific user."""
    try:
        logger.info(f"Fetching visualizations for user: {wallet_address}")
        
        # Get or create user directory
        user_dir = get_user_dir(wallet_address)
        
        # Get user-specific visualization files
        user_files = []
        if os.path.exists(user_dir):
            user_files = [f for f in os.listdir(user_dir) if f.endswith('.js')]
        
        logger.info(f"Found {len(user_files)} visualization files for user {wallet_address}")
        return {"files": user_files}
    except Exception as e:
        logger.error(f"Error listing user visualizations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visualizations/{file_path:path}")
async def get_visualization(file_path: str):
    """Get a specific visualization file by path."""
    try:
        logger.info(f"Fetching visualization file: {file_path}")
        
        # Build the full path
        full_path = os.path.join(VISUALIZATIONS_DIR, file_path)
        
        # Ensure the file exists
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            logger.error(f"Visualization file not found: {full_path}")
            raise HTTPException(status_code=404, detail=f"Visualization file not found: {file_path}")
        
        # Read the file
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        logger.info(f"Successfully retrieved visualization file: {file_path}")
        return {
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving visualization file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations")
async def list_conversations():
    """Get all conversations."""
    try:
        logger.info("Fetching list of conversations")
        conversations = get_all_conversations()
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str):
    """Get a specific conversation by ID."""
    try:
        logger.info(f"Fetching conversation: {conversation_id}")
        conversation = get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations")
async def create_new_conversation(data: Dict[str, Any] = Body(...)):
    """Create a new conversation."""
    try:
        title = data.get("title", "New Conversation")
        logger.info(f"Creating new conversation: {title}")
        new_conversation = create_conversation(title)
        return new_conversation
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations/{conversation_id}/nodes")
async def add_node_to_conversation(
    conversation_id: str, 
    data: Dict[str, Any] = Body(...)
):
    """Add a new node to a conversation."""
    try:
        content = data.get("content")
        node_type = data.get("type")
        parent_id = data.get("parentId")
        
        if not content or not node_type:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        logger.info(f"Adding {node_type} message to conversation: {conversation_id}")
        
        # Support for both old and new node structure
        if node_type == "user":
            # Create a new conversation node with just the user content
            new_node = add_conversation_node(
                conversation_id=conversation_id,
                user_content=content,
                parent_id=parent_id
            )
        elif node_type == "ai" and parent_id:
            # Update the existing node with AI content
            new_node = update_node_with_ai_response(
                conversation_id=conversation_id,
                node_id=parent_id,
                ai_content=content
            )
            # For legacy API compatibility, return a synthetic node
            if new_node:
                new_node = {
                    "id": str(uuid.uuid4()),
                    "type": "ai",
                    "timestamp": datetime.now().isoformat(),
                    "content": content,
                    "parentId": parent_id
                }
        else:
            # Fall back to legacy behavior
            new_node = add_message_node(conversation_id, content, node_type, parent_id)
        
        if not new_node:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        return new_node
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}/nodes/{node_id}/branch")
async def get_node_branch(conversation_id: str, node_id: str):
    """Get a branch of nodes starting from a specific node."""
    try:
        logger.info(f"Fetching branch for node: {node_id} in conversation: {conversation_id}")
        branch = get_branch(conversation_id, node_id)
        
        # Convert to message format for frontend compatibility
        formatted_branch = []
        for node in branch:
            # Check if this is a new format node with messages list
            if "messages" in node:
                # Extract user message
                user_message = next((m for m in node["messages"] if m["type"] == "user"), None)
                if user_message:
                    formatted_branch.append({
                        "id": node["id"] + "_user",
                        "type": "user",
                        "timestamp": user_message["timestamp"],
                        "content": user_message["content"],
                        "parentId": node["parentId"]
                    })
                
                # Extract AI message
                ai_message = next((m for m in node["messages"] if m["type"] == "ai"), None)
                if ai_message:
                    formatted_branch.append({
                        "id": node["id"] + "_ai",
                        "type": "ai",
                        "timestamp": ai_message["timestamp"],
                        "content": ai_message["content"],
                        "parentId": node["id"] + "_user"  # Link to the user message
                    })
            else:
                # Old format node, pass through unchanged
                formatted_branch.append(node)
        
        return {"branch": formatted_branch}
    except Exception as e:
        logger.error(f"Error getting branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visualizations/templates")
async def list_template_visualizations():
    """List all template visualization files available."""
    try:
        logger.info("Fetching list of template visualization files")
        
        # Get template visualization files
        template_files = []
        if os.path.exists(TEMPLATES_DIR):
            template_files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.js')]
        
        logger.info(f"Found {len(template_files)} template visualization files")
        return {"files": template_files}
    except Exception as e:
        logger.error(f"Error listing template visualizations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-prompt", response_model=Dict[str, Any])
async def process_prompt(data: Dict[str, Any] = Body(...)):
    """
    Process a user prompt through the AI agent.
    
    For now, this is a mock implementation that:
    1. Takes the user prompt
    2. Selects a visualization template from samples
    3. Customizes it slightly
    4. Saves it as a new visualization in the user's directory
    5. Returns the filename to the frontend
    """
    try:
        prompt = data.get("prompt")
        conversation_id = data.get("conversationId")
        node_id = data.get("nodeId")
        wallet_address = data.get("walletAddress")
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt")
        
        if not wallet_address:
            raise HTTPException(status_code=400, detail="Missing wallet address")
            
        logger.info(f"Processing prompt for wallet {wallet_address}: {prompt[:50]}...")
        
        # Get or create user directory
        user_dir = get_user_dir(wallet_address)
        
        # 1. Select a template file from templates directory
        template_files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.js')]
        if not template_files:
            # Ensure we have template files
            ensure_template_files_exist()
            template_files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.js')]
            
        if not template_files:
            raise HTTPException(status_code=500, detail="No template visualizations available")
            
        template_file = random.choice(template_files)
        template_path = os.path.join(TEMPLATES_DIR, template_file)
        
        # 2. Read the template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_code = f.read()
            
        # 3. Modify the template (simple modifications for demonstration)
        # Generate a unique ID for the new file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_filename = f"prompt_viz_{timestamp}.js"
        
        # Simple customization: Change the title and add a comment about the prompt
        modified_code = template_code.replace(
            "const titleText = ",
            f"// Generated from prompt: {prompt}\n  const titleText = "
        )
        
        # Replace the title
        modified_code = modified_code.replace(
            "\"Web3 DeFi Transactions Over Time\"",
            f"\"{prompt[:30]}...\""
        )
        
        # 4. Save the new visualization file in the user's directory
        new_file_path = os.path.join(user_dir, new_filename)
        with open(new_file_path, 'w', encoding='utf-8') as f:
            f.write(modified_code)
            
        logger.info(f"Created new visualization file for user {wallet_address}: {new_filename}")
        
        # 5. Update the conversation in chat history if IDs were provided
        if conversation_id and node_id:
            ai_response = f"I've created a visualization based on your prompt. You can view it by clicking on '{new_filename}' in the file explorer."
            update_node_with_ai_response(conversation_id, node_id, ai_response)
            logger.info(f"Updated conversation node with AI response")
        
        # Get the sanitized wallet address for the response
        sanitized_address = wallet_address.replace('0x', '').lower()
        
        return {
            "success": True,
            "message": "Visualization generated successfully",
            "filename": f"{sanitized_address}/{new_filename}"  # Return path with wallet address
        }
    except Exception as e:
        logger.error(f"Error processing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 