// Chat History API Service

const API_URL = 'http://localhost:8000/api';

/**
 * Fetch all conversations
 * @returns {Promise<Array>} List of conversations
 */
export const getConversations = async () => {
  try {
    console.log('Fetching all conversations');
    const response = await fetch(`${API_URL}/conversations`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched conversations:', data.conversations);
    return data.conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Fetch a specific conversation
 * @param {string} conversationId - ID of the conversation
 * @returns {Promise<Object>} Conversation data
 */
export const getConversation = async (conversationId) => {
  try {
    console.log(`Fetching conversation: ${conversationId}`);
    const response = await fetch(`${API_URL}/conversations/${conversationId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched conversation:', data);
    return data;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Create a new conversation
 * @param {string} title - Title for the conversation
 * @returns {Promise<Object>} New conversation data
 */
export const createConversation = async (title = 'New Conversation') => {
  try {
    console.log(`Creating new conversation: ${title}`);
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Created conversation:', data);
    return data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Add a new message node to a conversation (legacy API)
 * @param {string} conversationId - ID of the conversation
 * @param {string} content - Message content
 * @param {string} type - Node type (user/ai)
 * @param {string} parentId - ID of the parent node
 * @returns {Promise<Object>} New node data
 */
export const addMessageNode = async (conversationId, content, type, parentId = null) => {
  try {
    console.log(`Adding ${type} message to conversation: ${conversationId}`);
    const response = await fetch(`${API_URL}/conversations/${conversationId}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, type, parentId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add message node: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Added message node:', data);
    return data;
  } catch (error) {
    console.error('Error adding message node:', error);
    throw error;
  }
};

/**
 * Add a new complete conversation node (user prompt + AI reply)
 * @param {string} conversationId - ID of the conversation
 * @param {string} userContent - User message content
 * @param {string} aiContent - AI response content (optional)
 * @param {string} parentId - ID of the parent node
 * @returns {Promise<Object>} New conversation node data
 */
export const addConversationNode = async (conversationId, userContent, aiContent = null, parentId = null) => {
  try {
    console.log(`Adding conversation node to: ${conversationId}`);
    // For now, we'll use the existing API with adaptation in the backend
    const userNode = await addMessageNode(conversationId, userContent, 'user', parentId);
    
    // If AI content is provided, add it right away
    if (aiContent && userNode) {
      const aiNode = await addMessageNode(conversationId, aiContent, 'ai', userNode.id);
      return {
        id: userNode.id,
        userMessage: userNode,
        aiMessage: aiNode
      };
    }
    
    return userNode;
  } catch (error) {
    console.error('Error adding conversation node:', error);
    throw error;
  }
};

/**
 * Update a conversation node with AI content
 * @param {string} conversationId - ID of the conversation 
 * @param {string} nodeId - ID of the node to update
 * @param {string} aiContent - AI response content
 * @returns {Promise<Object>} Updated node data
 */
export const updateNodeWithAIContent = async (conversationId, nodeId, aiContent) => {
  try {
    console.log(`Updating node ${nodeId} with AI content`);
    // For now, we'll use the existing API by adding a child AI node
    const aiNode = await addMessageNode(conversationId, aiContent, 'ai', nodeId);
    return aiNode;
  } catch (error) {
    console.error('Error updating node with AI content:', error);
    throw error;
  }
};

/**
 * Get a branch of nodes starting from a specific node
 * @param {string} conversationId - ID of the conversation
 * @param {string} nodeId - ID of the starting node
 * @returns {Promise<Array>} List of nodes in the branch
 */
export const getNodeBranch = async (conversationId, nodeId) => {
  try {
    console.log(`Fetching branch for node: ${nodeId} in conversation: ${conversationId}`);
    const response = await fetch(`${API_URL}/conversations/${conversationId}/nodes/${nodeId}/branch`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch node branch: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched node branch:', data.branch);
    return data.branch;
  } catch (error) {
    console.error('Error fetching node branch:', error);
    throw error;
  }
}; 