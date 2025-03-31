# Chat Database with Visualization Generation

A web application that allows users to chat with an AI agent to generate D3.js visualizations.

## Features

- Chat interface to interact with an AI agent
- D3.js visualization generation based on user prompts
- Git-like chat history visualization
- File explorer to browse and view generated visualizations

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm

### AI Agents Setup

1. Install dependencies
   ```
   pip install -r agents/requirements.txt
   ```

2. Prepare .env in agents/
   ```
   DUNE_API_KEY= ""
   OPENAI_API_KEY=""
   OPENAI_BASE_URL=""
   MODEL_NAME=""
   ```

### Backend Setup

1. Install dependencies:
   ```
   pip install -r backend/requirements.txt
   ```

3. Run the server:
   ```
   python -m backend.main
   ```
   The backend will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```
   The frontend will be available at http://localhost:5173

4. Prepare .env in frontend/
   ```
   VITE_PRIVY_APP_ID=""
   VITE_PRIVY_APP_SECRET=""
   ```

## Usage

1. Login with your wallet
2. Subscribe to get access to the AI features
3. Type a prompt in the chat box asking for a visualization (e.g., "Is ethereum a good investment to make now?")
4. The AI will process your prompt, generate D3.js visualization and analysis

## Project Structure

```
├── backend/
│   ├── main.py         # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── utils/      # Utility functions for API calls
│   │   └── App.jsx     # Main application component
│   ├── package.json
│   └── vite.config.js
├── hardhat/            # SubscriptionNFT Contract definition, testing and deploying scripts
└── agents/             # AI agent implementation
```


## Colour Palette

#12121A
#22222E
#2F2F3B
#0CFCDD
#46E4FD
#3C93FD
#2669FC
#7667E6

![Moodboard](images/moodboard.png)

## TODO:

- [ ] enhance the AI agent workflow
- [ ] fix a professional-looking font for visualizations?
- [ ] prompt to unlock wallet