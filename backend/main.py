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

VISUALIZATIONS_DIR = "../frontend/src/components/visualizations"

@app.get("/api/visualizations")
async def list_visualizations():
    try:
        logger.info("Fetching list of visualization files")
        if not os.path.exists(VISUALIZATIONS_DIR):
            logger.error(f"Visualizations directory not found: {VISUALIZATIONS_DIR}")
            raise HTTPException(status_code=404, detail="Visualizations directory not found")
        
        files = [f for f in os.listdir(VISUALIZATIONS_DIR) if f.endswith('.js')]
        logger.info(f"Found {len(files)} visualization files")
        return {"files": files}
    except Exception as e:
        logger.error(f"Error listing visualizations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visualizations/{filename}")
async def get_visualization(filename: str):
    try:
        logger.info(f"Fetching visualization file: {filename}")
        file_path = os.path.join(VISUALIZATIONS_DIR, filename)
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        logger.info(f"Successfully read file: {filename}")
        return {"content": content}
    except Exception as e:
        logger.error(f"Error reading visualization file: {str(e)}")
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

@app.post("/api/process-prompt")
async def process_prompt(data: Dict[str, Any] = Body(...)):
    """
    Process a user prompt through the AI agent.
    
    For now, this is a mock implementation that:
    1. Takes the user prompt
    2. Selects a visualization template from samples
    3. Customizes it slightly
    4. Saves it as a new visualization
    5. Returns the filename to the frontend
    """
    try:
        prompt = data.get("prompt")
        conversation_id = data.get("conversationId")
        node_id = data.get("nodeId")
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt")
            
        logger.info(f"Processing prompt: {prompt[:50]}...")
        
        # TODO: In a real implementation, this would call the AI agent in ai-agent/
        # For now, we'll mock it by copying and modifying an existing visualization
        
        # 1. Select a template file (randomly choose between existing visualizations)
        template_files = [f for f in os.listdir(VISUALIZATIONS_DIR) if f.endswith('.js')]
        if not template_files:
            raise HTTPException(status_code=500, detail="No template visualizations available")
            
        template_file = random.choice(template_files)
        template_path = os.path.join(VISUALIZATIONS_DIR, template_file)
        
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
        
        # 4. Save the new visualization file
        new_file_path = os.path.join(VISUALIZATIONS_DIR, new_filename)
        with open(new_file_path, 'w', encoding='utf-8') as f:
            f.write(modified_code)
            
        logger.info(f"Created new visualization file: {new_filename}")
        
        # 5. Update the conversation in chat history if IDs were provided
        if conversation_id and node_id:
            ai_response = f"I've created a visualization based on your prompt. You can view it by clicking on '{new_filename}' in the file explorer."
            update_node_with_ai_response(conversation_id, node_id, ai_response)
            logger.info(f"Updated conversation node with AI response")
        
        return {
            "success": True,
            "message": "Visualization generated successfully",
            "filename": new_filename
        }
    except Exception as e:
        logger.error(f"Error processing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 