import dspy
from pydantic import BaseModel
import json


class Plotter(dspy.Signature):
    """You are an expert in Dune Analytics. You are given a user's prompt and a list of available tables. You need to plot the data in the table."""

    prompt = dspy.InputField(prefix="User's prompt:")
    reasoning: str = dspy.OutputField(prefix="Reasoning:")
    plot_code: str = dspy.OutputField(prefix="The plot code:")


class SqlGenerateAgent:
    def __init__(self, engine=None) -> None:
        self.engine = engine
        self.split_task = dspy.Predict(TaskSplitter)

    def split_task_by_prompt(self, prompt: str):

        response = self.split_task(prompt=prompt)
        reasoning = response.reasoning
        tasks = response.tasks
        print(f"Reasoning: {reasoning}")
        print(f"The list of tasks: {tasks}")

        return tasks
