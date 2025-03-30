from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, Text
from . import Base, engine

class VisualizationDB(Base):
    __tablename__ = "visualizations"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text)  # The prompt used to generate the visualization
    visualization_code = Column(Text)  # The JS code for the visualization
    created_at = Column(DateTime, default=datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.now(datetime.UTC), onupdate=datetime.now(datetime.UTC))

# Database operations for visualization
def create_visualization(db, prompt: str, visualization_code: str):
    try:
        new_visualization = VisualizationDB(
            prompt=prompt,
            visualization_code=visualization_code,
            created_at=datetime.now(datetime.UTC),
            updated_at=datetime.now(datetime.UTC)
        )
        db.add(new_visualization)
        db.flush()  # Check constraints
        return new_visualization
    except Exception as e:
        raise Exception(f"Error creating visualization: {str(e)}")

def get_visualization(db, visualization_id: int) -> VisualizationDB:
    visualization = db.query(VisualizationDB).filter(VisualizationDB.id == visualization_id).first()
    return visualization

def get_all_visualizations(db) -> list[VisualizationDB]:
    visualizations = db.query(VisualizationDB).all()
    return visualizations

def update_visualization(db, visualization_id: int, prompt: str = None, visualization_code: str = None):
    visualization = db.query(VisualizationDB).filter(VisualizationDB.id == visualization_id).first()
    if visualization:
        if prompt is not None:
            visualization.prompt = prompt
        if visualization_code is not None:
            visualization.visualization_code = visualization_code
        visualization.updated_at = datetime.now(datetime.UTC)
        db.commit()

def delete_visualization(db, visualization_id: int):
    visualization = db.query(VisualizationDB).filter(VisualizationDB.id == visualization_id).first()
    if visualization:
        db.delete(visualization)
        db.commit()

# Create tables if they don't exist
Base.metadata.create_all(bind=engine) 