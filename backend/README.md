```
- app.py
- backend.py
- dune.py
etc.
```


1. User send a POST request from frontend chat pane to the backend to send their prompt.

2. Backend send the prompt to the AI agent (the function will be implemented later in ai-agent/ folder, NO NEED TO IMPLEMENT THIS ,let's assume we have that and return some dummy data)

3. AI-agent process the prompt and produce a visualization js code.

4. Backend receive the js code, save it into database (can we save it as a js file in the frontend folder visualization/ for now?)

5. Backend send the js code back to the user (as the response for the POST request)



