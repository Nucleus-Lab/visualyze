import dspy
from pydantic import BaseModel
import json


class Table(BaseModel):
    table_name: str
    description: str


class FullTable(BaseModel):
    table_name: str
    description: str
    columns: dict


class TableRetriever(dspy.Signature):
    """Given user's prompt, select the table which is most relevant to the user's query"""

    prompt = dspy.InputField(prefix="User's prompt:")
    table_list: list[FullTable] = dspy.InputField(prefix="Available table list:")
    reasoning: str = dspy.OutputField(prefix="Reasoning:")
    most_relevant_table: str = dspy.OutputField(
        prefix="The name of the most relevant table:"
    )


class SqlGenerator(dspy.Signature):
    """Given user's prompt, generate Trino SQL query, directly return the Trino SQL query without including ```sql```.
    The retrieved table will be saved as a csv file, output the appropriate filename based on the user's prompt, for example: 0x5e89f8d81c74e311458277ea1be3d3247c7cd7d1_1inch_txs_results.csv
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: Table = dspy.InputField(prefix="The most relevant table:")
    trino_sql_query: str = dspy.OutputField(prefix="The generated Trino SQL query:")
    output_filename: str = dspy.OutputField(prefix="The appropriate filename:")


class SqlOptimizer(dspy.Signature):
    """I want to query blockchain data for a specific analytical purpose, but I’d like to **minimize resource usage and avoid unnecessary data overhead**.

    Write an **efficient and optimized TrinoSQL query** that follows these principles:

    - Avoid full table scans or returning large raw datasets
    - Only select required fields explicitly (no SELECT *)
    - Limit the time range using `block_time` or similar timestamp fields
    - Reduce data granularity where possible (e.g. daily/hourly aggregation instead of per-event data)
    - Use Trino-supported window functions (e.g., ROW_NUMBER, RANK) or aggregations (e.g., MIN, MAX, AVG) to reduce data volume
    - Use `WHERE` clauses to filter early and reduce scanned rows (pushdown filters)
    - Prefer filtering on indexed or partitioned fields where applicable (e.g., `token_address`, `block_time`, `chain_id`)
    - If analyzing a time-series trend, extract only representative points per interval (e.g., first trade per day or hourly average)

    Also, if the source table is large, suggest using `WITH` CTEs to isolate relevant subsets before joining or applying window functions.

    Please write the query in **TrinoSQL syntax**.
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: Table = dspy.InputField(prefix="The most relevant table:")
    original_trino_sql_query: str = dspy.InputField(
        prefix="The original Trino SQL query:"
    )
    optimized_trino_sql_query: str = dspy.OutputField(
        prefix="The optimized Trino SQL query:"
    )


class SqlGenerateAgent:
    def __init__(self, table_list_file_path: str, engine=None) -> None:
        self.engine = engine
        self.retrieve_table = dspy.Predict(TableRetriever)
        self.generate_sql = dspy.Predict(SqlGenerator)

        with open(table_list_file_path, "r") as f:
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
        result = self.generate_sql(prompt=prompt, most_relevant_table=table_detail)
        sql = result.trino_sql_query
        filename = result.output_filename
        return sql, filename
