import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import shutil
from agents.main import analyze_figure

router = APIRouter()

# Directory to save visualization images
VIZ_IMG_DIR = os.path.join("backend", "viz_img")

# Create directory if it doesn't exist
os.makedirs(VIZ_IMG_DIR, exist_ok=True)

@router.post("/save-visualization-image")
async def save_visualization_image(file: UploadFile = File(...)):
    """
    Save a visualization image to the server
    """
    print(f"Received image file: {file.filename}")
    
    try:
        # Create a file path to save the image
        file_path = os.path.join(VIZ_IMG_DIR, file.filename)
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Image saved to: {file_path}")
        
        # turn the file path into a full path
        file_path = os.path.abspath(file_path)
        
        # Load the latest prompt from backend/data/prompts.txt
        with open("backend/data/prompts.txt", "r", encoding="utf-8") as f:
            prompt = f.readlines()[-1].strip()
        
        # Call the figure analyzer agent
        analyze_figure(prompt, [file_path])
        
        return JSONResponse(content={
            "status": "success",
            "message": "Image saved successfully",
            "filepath": file_path
        })
    
    except Exception as e:
        print(f"Error saving image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving image: {str(e)}") 