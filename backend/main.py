from fastapi import FastAPI, HTTPException, Body, Request
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
import shutil
from dotenv import load_dotenv
from backend.endpoints.image_handler import router as image_router

load_dotenv()

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
VISUALIZATIONS_DIR = "frontend/public/visualizations"
TEMPLATES_DIR = os.path.join(VISUALIZATIONS_DIR, "templates")
os.makedirs(VISUALIZATIONS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

DATA_DIR = "agents/data"
TARGET_DATA_DIR = "frontend/public/data"
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(TARGET_DATA_DIR, exist_ok=True)

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

# Endpoint for generating visualizations
# async def generate_visualization(data):
#     """
#     Generate visualizations based on user prompt and input files.
    
#     Takes the user prompt and file paths, generates visualizations,
#     and returns paths to the created files.
#     """
#     print("visualization-data:", data)
#     try:
#         prompt = data.get("prompt")
#         wallet_address = data.get("walletAddress")
#         file_paths = data.get("filePaths", [])
        
#         if not prompt:
#             raise HTTPException(status_code=400, detail="Missing prompt")
        
#         if not wallet_address:
#             raise HTTPException(status_code=400, detail="Missing wallet address")
            
#         logger.info(f"Generating visualization for wallet {wallet_address}: {prompt[:50]}...")
        
#         # Save the prompt to the backend/data/prompts.txt
#         with open("backend/data/prompts.txt", "a", encoding="utf-8") as f:
#             f.write(f"{datetime.now()} [VIZ]: {prompt}\n")
        
#         # Get or create user directory
#         user_viz_dir = get_user_visualization_dir(wallet_address)
        
#         print("prompt:", prompt)
#         print("file_paths:", file_paths)
        
#         # Generate visualization results
#         results = prompt_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir, attachments=file_paths)
#         # results = temp_mock_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir)
        
#         print("visualization results:", results)
        
#         if not isinstance(results, list):
#             raise HTTPException(status_code=500, detail="Expected list result from visualization generation")
            
#         # Get the sanitized wallet address for the response
#         sanitized_address = wallet_address.replace('0x', '').lower()
        
#         filenames = []
        
#         for r in results:
#             if r['result'] == "success":
#                 filenames.append(f"{sanitized_address}/{r['file_name']}.js")
#                 logger.info(f"Created new visualization file for user {wallet_address}: {r['file_name']}")
                
#                 # Copy the corresponding CSV file to the target directory
#                 base_name = r['file_name']
#                 csv_filename = f"{base_name}.csv"
#                 csv_source_path = os.path.join(DATA_DIR, csv_filename)
#                 csv_dest_path = os.path.join(TARGET_DATA_DIR, csv_filename)
#                 shutil.copy2(csv_source_path, csv_dest_path)
            
#         return {
#             "success": True,
#             "message": "Visualization generated successfully",
#             "filenames": filenames  # Return paths with wallet address
#         }
#     except Exception as e:
#         logger.error(f"Error generating visualization: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# Endpoint for data analysis
async def analyze_data(data):
    """
    Process a user prompt through the AI agent for data analysis.
    
    Takes the user prompt and file paths, performs analysis,
    and returns textual analysis results.
    """
    print("analysis-data:", data)
    try:
        wallet_address = data.get("walletAddress")
        file_paths = data.get("filePaths", [])
        
        if not wallet_address:
            raise HTTPException(status_code=400, detail="Missing wallet address")
            
        
        # Get the prompt from the backend/data/prompts.txt
        with open("backend/data/prompts.txt", "r", encoding="utf-8") as f:
            prompt = f.readlines()[-1].split(": ")[1].strip()
        
        print("prompt:", prompt)
        print("file_paths:", file_paths)
        
        logger.info(f"Analyzing data for wallet {wallet_address}: {prompt[:50]}...")
        
        # Analyze data
        if file_paths:
            # Use provided files for analysis
            results = prompt_agent(prompt, csv_dir="", viz_dir="", attachments=file_paths)
        else:
            results = {"success": False, "message": "No files provided for analysis", "analysis": "No analysis performed"}
        
        print("analysis results:", results)
        
        if isinstance(results, str):
            # Analysis produced textual results
            return {
                "success": True,
                "message": "Analysis generated successfully",
                "analysis": results
            }
        else:
            # Unexpected result format
            raise HTTPException(status_code=500, detail="Expected string result from data analysis")
            
    except Exception as e:
        logger.error(f"Error analyzing data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# FastAPI route definitions
# @app.post("/api/generate-visualization")
# async def generate_visualization_endpoint(request: Request):
#     data = await request.json()
#     return await generate_visualization(data)

@app.post("/api/analyze-data")
async def analyze_data_endpoint(request: Request):
    data = await request.json()
    return await analyze_data(data)

# Keep the original endpoint for backward compatibility
@app.post("/api/process-prompt")
async def process_prompt_endpoint(request: Request):
    data = await request.json()
    return await process_prompt(data)

# Original function (you can eventually deprecate this)
async def process_prompt(data):
    """
    Process a user prompt through the AI agent.
    
    This is the original implementation that handles both visualization and analysis.
    Consider using the dedicated endpoints instead.
    """
    print("data-first", data)
    try:
        prompt = data.get("prompt")
        conversation_id = data.get("conversationId")
        node_id = data.get("nodeId")
        wallet_address = data.get("walletAddress")
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt")
        
        # Save the prompt to the backend/data/prompts.txt
        with open("backend/data/prompts.txt", "a", encoding="utf-8") as f:
            f.write(f"{datetime.now()}: {prompt}\n")
        
        if not wallet_address:
            raise HTTPException(status_code=400, detail="Missing wallet address")
            
        logger.info(f"Processing prompt for wallet {wallet_address}: {prompt[:50]}...")
        
        # Get or create user directory
        user_viz_dir = get_user_visualization_dir(wallet_address)
        
        print("prompt", prompt)
        print("data", data)
    
        # results = temp_mock_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir)
        results = prompt_agent(prompt, csv_dir=DATA_DIR, viz_dir=user_viz_dir)
        
        print("results", results)
        
        if type(results) == list:
            # Get the sanitized wallet address for the response
            sanitized_address = wallet_address.replace('0x', '').lower()
            
            filenames = []
            
            for r in results:
                if r['result'] == "success":
                    filenames.append(f"{sanitized_address}/{r['file_name']}.js")
                    logger.info(f"Created new visualization file for user {wallet_address}: {r['file_name']}")
                    
                    # copy the newly generated csv files from DATA_DIR to TARGET_DATA_DIR
                    # Copy the corresponding CSV file to the target directory
                    base_name = r['file_name']
                    csv_filename = f"{base_name}.csv"
                    csv_source_path = os.path.join(DATA_DIR, csv_filename)
                    csv_dest_path = os.path.join(TARGET_DATA_DIR, csv_filename)
                    shutil.copy2(csv_source_path, csv_dest_path)
                
            return {
                "success": True,
                "message": "Visualization generated successfully",
                "filenames": filenames  # Return paths with wallet address
            }
        
        elif type(results) == str:
            return {
                "success": True,
                "message": "Analysis generated successfully",
                "analysis": results
            }
        
        else:
            raise HTTPException(status_code=500, detail="Error processing prompt")
    except Exception as e:
        logger.error(f"Error processing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Then in your app definition, include the router
app.include_router(image_router, prefix="/api", tags=["images"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 