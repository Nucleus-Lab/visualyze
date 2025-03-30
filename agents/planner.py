import dspy
from pydantic import BaseModel
import json


class TaskSplitter(dspy.Signature):
    """You are an expert in Dune Analytics. You are given a user's prompt and a list of available tables. You need to split the user's prompt into a list of tasks. Each task is a question that can be answered by a table."""

    prompt = dspy.InputField(prefix="User's prompt:")
    reasoning: str = dspy.OutputField(prefix="Reasoning:")
    tasks: list[str] = dspy.OutputField(prefix="The list of tasks:")


class Planner:
    def __init__(self, engine=None) -> None:
        self.engine = engine
        self.split_task = dspy.Predict(TaskSplitter)

    def split_task_by_prompt(self, prompt: str):

        response = self.split_task(prompt=prompt)
        reasoning = response.reasoning
        tasks = response.tasks
        print(f"Reasoning: {reasoning}")
        print(f"The list of tasks:")
        for idx, task in enumerate(tasks):
            print(f"  {idx+1}. {task}")

        return tasks
