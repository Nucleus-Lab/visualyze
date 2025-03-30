from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from typing import Dict, Any
from backend.database.chat_history import (
    get_all_conversations, 
    get_conversation,
    create_conversation, 
    add_message_node,
    add_conversation_node,
    update_node_with_ai_response,
    get_branch
)
from agents.main import main as prompt_agent
# temp TODO:
from agents.temp.temp_agent import temp_mock_agent
import uuid
from datetime import datetime

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

# TODO: define this in config/.env
# Define base visualization directory and user-specific paths
VISUALIZATIONS_DIR = "frontend/src/components/visualizations"
TEMPLATES_DIR = os.path.join(VISUALIZATIONS_DIR, "templates")
os.makedirs(VISUALIZATIONS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

DATA_DIR = "frontend/public/data"
os.makedirs(DATA_DIR, exist_ok=True)

# Helper function to get or create user directory
def get_user_visualization_dir(wallet_address):
    """Create a user-specific directory based on wallet address and return the path"""
    # Sanitize wallet address for use as directory name
    sanitized_address = wallet_address.replace('0x', '').lower()
    
    # Create user directory
    user_dir = os.path.join(VISUALIZATIONS_DIR, sanitized_address)
    os.makedirs(user_dir, exist_ok=True)
    
    logger.info(f"Using user directory: {user_dir}")
    return user_dir

## ====== VISUALIZATION RELATED ======

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
        user_dir = get_user_visualization_dir(wallet_address)
        
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


## ====== CONVERSATION RELATED ======

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

## MAIN FUNCTION

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
        user_viz_dir = get_user_visualization_dir(wallet_address)
        
        # TODO: change this to actual
        # results = temp_mock_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir)
        results = prompt_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir)
        
        print("results", results)
        
        # Get the sanitized wallet address for the response
        sanitized_address = wallet_address.replace('0x', '').lower()
        
        filenames = []
        
        for r in results:
            if r['result'] == "success":
                filenames.append(f"{sanitized_address}/{r['file_name']}")
                logger.info(f"Created new visualization file for user {wallet_address}: {r['file_name']}")
                # TODO: what to do with AI response??
                # Update the conversation in chat history if IDs were provided
                # if conversation_id and node_id:
                #     ai_response = f"I've created a visualization based on your prompt. You can view it by clicking on '{r['file_name']}' in the file explorer."
                #     update_node_with_ai_response(conversation_id, node_id, ai_response)
                #     logger.info(f"Updated conversation node with AI response")
                        
        
        
        return {
            "success": True,
            "message": "Visualization generated successfully",
            "filenames": filenames  # Return paths with wallet address
        }
    except Exception as e:
        logger.error(f"Error processing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 