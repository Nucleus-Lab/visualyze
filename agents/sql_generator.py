import dspy
from pydantic import BaseModel
import json
import os
from dotenv import load_dotenv

load_dotenv()

dspy.disable_litellm_logging()
dspy.disable_logging()


class Table(BaseModel):
    table_name: str
    description: str


class FullTable(BaseModel):
    table_name: str
    description: str
    columns: dict


lm = dspy.LM(
    model=os.getenv("MODEL_NAME"),
    api_key=os.getenv("OPENAI_API_KEY"),
    api_base=os.getenv("OPENAI_BASE_URL"),
)
dspy.configure(lm=lm)


class TableRetriever(dspy.Signature):
    """Given user's prompt, select the table which is most relevant to the user's query"""

    prompt = dspy.InputField(prefix="User's prompt:")
    table_list: list[FullTable] = dspy.InputField(prefix="Available table list:")
    reasoning: str = dspy.OutputField(prefix="Reasoning:")
    most_relevant_table: str = dspy.OutputField(
        prefix="The name of the most relevant table:"
    )


class SqlGenerator(dspy.Signature):
    """Given user's prompt, generate Trino SQL query, directly return the Trino SQL query without including ```sql```"""

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: Table = dspy.InputField(prefix="The most relevant table:")
    trino_sql_query: str = dspy.OutputField(prefix="The generated Trino SQL query:")


class SqlGenerateAgent:
    def __init__(self, engine=None) -> None:
        self.engine = engine
        self.retrieve_table = dspy.Predict(TableRetriever)
        self.generate_sql = dspy.Predict(SqlGenerator)

        with open(
            "/home/sheropen/project/hackathon/chat_db/ai_agent/utils/table_list.json",
            "r",
        ) as f:
            data = json.load(f)
        self.full_table_list = [FullTable(**item) for item in data]
        self.full_table_list_dict = {
            table.table_name: table for table in self.full_table_list
        }

    def generate_sql_by_prompt(self, prompt: str):

        response = self.retrieve_table(prompt=prompt, table_list=self.full_table_list)
        reasoning = response.reasoning
        table_name = response.most_relevant_table
        print(f"Reasoning: {reasoning}")
        print(f"The most relevant table: {table_name}")

        table_detail = self.full_table_list_dict[table_name]
        print(f"The table detail: {table_detail}")
        sql = self.generate_sql(
            prompt=prompt, most_relevant_table=table_detail
        ).trino_sql_query
        return sql
