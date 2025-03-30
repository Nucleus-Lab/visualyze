import dspy
from pydantic import BaseModel
import json
from utils.data_structures import FullTable


class TableRetriever(dspy.Signature):
    """Given user's prompt, select the table which is most relevant to the user's query"""

    prompt: str = dspy.InputField(prefix="User's prompt:")
    table_list: list[FullTable] = dspy.InputField(prefix="Available table list:")
    reasoning: str = dspy.OutputField(prefix="Reasoning:")
    most_relevant_table: str = dspy.OutputField(
        prefix="The name of the most relevant table:"
    )


class SqlQueryGeneratorWithFullTable(dspy.Signature):
    """Given user's prompt, generate Trino SQL query, directly return the Trino SQL query without including ```sql```.

    # Guideline
    1. For varbinary type columns, you should output the hex format of the column value instead of string (i.e., 0x1234567890 instead of '0x1234567890')
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    table_list: list[FullTable] = dspy.InputField(prefix="Available table list:")
    trino_sql_query: str = dspy.OutputField(prefix="The generated Trino SQL query:")


class SqlGenerator(dspy.Signature):
    """Given user's prompt, generate Trino SQL query, directly return the Trino SQL query without including ```sql```.
    The retrieved table will be saved as a csv file, output the appropriate filename based on the user's prompt.

    # Guideline
    1. Output filename should be short and represent the generated query
    2. For varbinary type columns, you should output the hex format of the column value instead of string (i.e., 0x1234567890 instead of '0x1234567890')
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: FullTable = dspy.InputField(prefix="The most relevant table:")
    trino_sql_query: str = dspy.OutputField(prefix="The generated Trino SQL query:")
    output_filename: str = dspy.OutputField(prefix="The appropriate filename:")


class SqlOptimizer(dspy.Signature):
    """
    Given a Trino SQL query, optimize it to minimize resource usage and avoid unnecessary data overhead.

    # Guidelines
    Write an efficient and optimized Trino SQL query that follows these principles:
    1. Avoid full table scans or returning large raw datasets
    2. Only select required fields explicitly (no SELECT *)
    3. Reduce data granularity where possible (e.g. daily/hourly aggregation instead of per-event data)
    4. Use Trino-supported window functions (e.g., ROW_NUMBER, RANK) or aggregations (e.g., MIN, MAX, AVG) to reduce data volume
    5. Use `WHERE` clauses to filter early and reduce scanned rows (pushdown filters)
    6. If analyzing a time-series trend, extract only representative points per interval (e.g., first trade per day or hourly average)
    7. Limit the number of rows returned by the query, try your best to get the most important data regarding the user's prompt within the limit contrainst

    Also, if the source table is large, suggest using `WITH` CTEs to isolate relevant subsets before joining or applying window functions.

    Remember, output the optimized Trino SQL query in TrinoSQL syntax.
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: FullTable = dspy.InputField(prefix="The most relevant table:")
    original_trino_sql_query: str = dspy.InputField(
        prefix="The original Trino SQL query:"
    )
    optimized_trino_sql_query: str = dspy.OutputField(
        prefix="The optimized Trino SQL query:"
    )


class RetrySQLGenerator(dspy.Signature):
    """Given user's prompt, generated Trino SQL query, and error returned after executing the query, directly return the refined Trino SQL query without including ```sql```.

    # Guideline
    1. Refine the original Trino SQL query to minimize resource usage and avoid unnecessary data overhead
    2. The refined Trino SQL query should be more efficient and optimized
    """

    prompt: str = dspy.InputField(prefix="User's prompt:")
    most_relevant_table: FullTable = dspy.InputField(prefix="The most relevant table:")
    original_trino_sql_query: str = dspy.InputField(
        prefix="The original Trino SQL query:"
    )
    error: str = dspy.InputField(prefix="The error returned after executing the query:")
    refined_trino_sql_query: str = dspy.OutputField(
        prefix="The refined Trino SQL query:"
    )


class SqlGenerateAgent:
    def __init__(self, table_list_file_path: str, engine=None) -> None:
        self.engine = engine
        self.retrieve_table = dspy.Predict(TableRetriever)
        self.generate_sql_with_full_table = dspy.Predict(SqlQueryGeneratorWithFullTable)
        self.generate_sql = dspy.Predict(SqlGenerator)
        self.optimize_sql = dspy.Predict(SqlOptimizer)
        self.retry_generate_sql = dspy.Predict(RetrySQLGenerator)

        with open(table_list_file_path, "r") as f:
            data = json.load(f)
        self.full_table_list = [FullTable(**item) for item in data]
        self.full_table_list_dict = {
            table.table_name: table for table in self.full_table_list
        }

    def generate_sql_by_prompt_with_full_table(self, prompt: str):
        response = self.generate_sql_with_full_table(
            prompt=prompt, table_list=self.full_table_list
        )
        return response.trino_sql_query

    def generate_sql_by_prompt(self, prompt: str):
        print(f"The user's prompt: {prompt}")
        response = self.retrieve_table(prompt=prompt, table_list=self.full_table_list)
        reasoning = response.reasoning
        table_name = response.most_relevant_table
        print(f"Reasoning: {reasoning}")
        print(f"The most relevant table: {table_name}")

        table_detail = self.full_table_list_dict[table_name]
        # print(f"The table detail: {table_detail}")

        result = self.generate_sql(prompt=prompt, most_relevant_table=table_detail)
        print(f"The generated Trino SQL query: {result.trino_sql_query}")

        optimized_sql = self.optimize_sql(
            prompt=prompt,
            most_relevant_table=table_detail,
            original_trino_sql_query=result.trino_sql_query,
        )
        print(
            f"The optimized Trino SQL query: {optimized_sql.optimized_trino_sql_query}"
        )

        sql = optimized_sql.optimized_trino_sql_query
        filename = result.output_filename
        return sql, filename, table_detail

    def retry_generate_sql_by_prompt(
        self, prompt: str, original_sql: str, error: str, table_detail: FullTable
    ):
        result = self.retry_generate_sql(
            prompt=prompt,
            most_relevant_table=table_detail,
            original_trino_sql_query=original_sql,
            error=error,
        )
        return result.refined_trino_sql_query
