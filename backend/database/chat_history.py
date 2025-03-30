import json
import os
import uuid
from datetime import datetime
import logging
from typing import Dict, List, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Path to store chat history JSON
HISTORY_DIR = "data"
HISTORY_FILE = os.path.join(HISTORY_DIR, "chat_history.json")

# Ensure the data directory exists
os.makedirs(HISTORY_DIR, exist_ok=True)

def _load_history() -> Dict[str, Any]:
    """Load chat history from JSON file or create if it doesn't exist."""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # Create default structure
            default_history = {"conversations": []}
            _save_history(default_history)
            return default_history
    except Exception as e:
        logger.error(f"Error loading chat history: {str(e)}")
        # Return empty structure if loading fails
        return {"conversations": []}

def _save_history(history: Dict[str, Any]) -> bool:
    """Save chat history to JSON file."""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving chat history: {str(e)}")
        return False

def get_all_conversations() -> List[Dict[str, Any]]:
    """Get all conversations."""
    history = _load_history()
    return history.get("conversations", [])

def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific conversation by ID."""
    conversations = get_all_conversations()
    for conv in conversations:
        if conv["id"] == conversation_id:
            return conv
    return None

def create_conversation(title: str) -> Dict[str, Any]:
    """Create a new conversation."""
    history = _load_history()
    
    # Generate a unique ID
    conversation_id = str(uuid.uuid4())
    
    # Create conversation with initial root node
    new_conversation = {
        "id": conversation_id,
        "title": title,
        "created_at": datetime.now().isoformat(),
        "nodes": [
            {
                "id": str(uuid.uuid4()),
                "type": "root",
                "timestamp": datetime.now().isoformat(),
                "content": "Conversation started",
                "parentId": None
            }
        ]
    }
    
    history["conversations"].append(new_conversation)
    _save_history(history)
    
    return new_conversation

def add_conversation_node(
    conversation_id: str, 
    user_content: str,
    ai_content: str = None,
    parent_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Add a new conversation node containing both user prompt and AI reply.
    
    Args:
        conversation_id: ID of the conversation
        user_content: User message content
        ai_content: AI response content (can be None if not yet available)
        parent_id: ID of the parent node (None for root)
        
    Returns:
        The created node or None if failed
    """
    history = _load_history()
    
    # Find the conversation
    conversation = None
    for conv in history["conversations"]:
        if conv["id"] == conversation_id:
            conversation = conv
            break
    
    if not conversation:
        return None
    
    # If no parent_id is provided and this is not the first node,
    # set parent to the last node
    if parent_id is None and len(conversation["nodes"]) > 0:
        parent_id = conversation["nodes"][-1]["id"]
    
    # Create new node containing both messages
    timestamp = datetime.now().isoformat()
    new_node = {
        "id": str(uuid.uuid4()),
        "timestamp": timestamp,
        "parentId": parent_id,
        "messages": [
            {
                "type": "user",
                "timestamp": timestamp,
                "content": user_content
            }
        ]
    }
    
    # Add AI response if provided
    if ai_content:
        new_node["messages"].append({
            "type": "ai",
            "timestamp": datetime.now().isoformat(),
            "content": ai_content
        })
    
    conversation["nodes"].append(new_node)
    _save_history(history)
    
    return new_node

def update_node_with_ai_response(
    conversation_id: str,
    node_id: str,
    ai_content: str
) -> Optional[Dict[str, Any]]:
    """
    Update a node by adding or updating the AI response.
    
    Args:
        conversation_id: ID of the conversation
        node_id: ID of the node to update
        ai_content: AI response content
        
    Returns:
        The updated node or None if failed
    """
    history = _load_history()
    
    # Find the conversation
    conversation = None
    for conv in history["conversations"]:
        if conv["id"] == conversation_id:
            conversation = conv
            break
    
    if not conversation:
        return None
    
    # Find the node
    node = None
    for n in conversation["nodes"]:
        if n["id"] == node_id:
            node = n
            break
    
    if not node:
        return None
    
    # Check if AI message already exists
    ai_message_exists = False
    for message in node.get("messages", []):
        if message["type"] == "ai":
            # Update existing AI message
            message["content"] = ai_content
            message["timestamp"] = datetime.now().isoformat()
            ai_message_exists = True
            break
    
    # Add new AI message if it doesn't exist
    if not ai_message_exists:
        if "messages" not in node:
            node["messages"] = []
        
        node["messages"].append({
            "type": "ai",
            "timestamp": datetime.now().isoformat(),
            "content": ai_content
        })
    
    _save_history(history)
    return node

def get_branch(conversation_id: str, node_id: str) -> List[Dict[str, Any]]:
    """
    Get a branch of nodes starting from a specific node.
    
    Args:
        conversation_id: ID of the conversation
        node_id: ID of the starting node
        
    Returns:
        List of nodes in the branch
    """
    conversation = get_conversation(conversation_id)
    if not conversation:
        return []
    
    # Helper function to trace branch
    def trace_branch(current_id, all_nodes):
        branch = []
        current_node = next((n for n in all_nodes if n["id"] == current_id), None)
        
        if not current_node:
            return branch
        
        # Add current node
        branch.append(current_node)
        
        # Find all nodes that have this node as parent
        children = [n for n in all_nodes if n.get("parentId") == current_id]
        
        # If multiple children, this is a branch point
        for child in children:
            branch.extend(trace_branch(child["id"], all_nodes))
            
        return branch
    
    return trace_branch(node_id, conversation["nodes"])

# Legacy support function to ensure backward compatibility
def add_message_node(
    conversation_id: str, 
    content: str, 
    node_type: str,
    parent_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Legacy function to support existing API.
    Now routes to the new node structure internally.
    """
    logger.info("Using legacy add_message_node, will convert to new structure")
    
    # Only support user/ai types
    if node_type not in ["user", "ai"]:
        return None
    
    # Load history
    history = _load_history()
    conversation = None
    for conv in history["conversations"]:
        if conv["id"] == conversation_id:
            conversation = conv
            break
    
    if not conversation:
        return None
    
    # Special case for user messages - create a new conversation node
    if node_type == "user":
        return add_conversation_node(
            conversation_id=conversation_id,
            user_content=content,
            parent_id=parent_id
        )
    
    # For AI messages, find the last node (which should be a user message node)
    # and add the AI message to it
    if node_type == "ai" and parent_id:
        parent_node = None
        for node in conversation["nodes"]:
            if node["id"] == parent_id:
                parent_node = node
                break
        
        if parent_node:
            return update_node_with_ai_response(
                conversation_id=conversation_id,
                node_id=parent_node["id"],
                ai_content=content
            )
    
    # Fallback to legacy behavior
    new_node = {
        "id": str(uuid.uuid4()),
        "type": node_type,
        "timestamp": datetime.now().isoformat(),
        "content": content,
        "parentId": parent_id
    }
    
    conversation["nodes"].append(new_node)
    _save_history(history)
    
    return new_node 