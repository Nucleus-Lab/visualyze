import base64
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()


class AnalyzeFigureAgent:
    def __init__(self):
        self.client = OpenAI()

    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 string"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    def analyze_figures(
        self, image_paths: list[str], prompt: str = "请分析这些图片并比较它们的内容"
    ) -> str:
        """
        Analyze multiple images using OpenAI Vision API

        Args:
            image_paths: List of paths to image files
            prompt: Custom prompt for analysis
        """
        # Create message content starting with the text prompt
        content = [{"type": "text", "text": prompt}]

        # Add each image to the content
        for image_path in image_paths:
            base64_image = self.encode_image(image_path)
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{base64_image}"},
                }
            )

        response = self.client.chat.completions.create(
            model=os.getenv("MODEL"),
            messages=[{"role": "user", "content": content}],
            max_tokens=1000,
        )
        return response.choices[0].message.content
