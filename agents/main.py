import dspy
from dotenv import load_dotenv
import os
from sql_generator import SqlGenerateAgent
from utils.dune_client import DuneQueryClient
from planner import Planner
import logging

dspy.disable_litellm_logging()
dspy.disable_logging()
loggers = ["LiteLLM Proxy", "LiteLLM Router", "LiteLLM"]

for logger_name in loggers:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.CRITICAL + 1)

load_dotenv()


lm = dspy.LM(
    model=os.getenv("MODEL_NAME"),
    api_key=os.getenv("OPENAI_API_KEY"),
    api_base=os.getenv("OPENAI_BASE_URL"),
)
dspy.configure(lm=lm)

dune_client = DuneQueryClient(api_key=os.getenv("DUNE_API_KEY"))


def main(prompt: str, result_dir: str):
    os.makedirs(result_dir, exist_ok=True)

    planner = Planner()
    sql_generator = SqlGenerateAgent(
        table_list_file_path="/home/sheropen/project/hackathon/chat_db/agents/utils/table_list.json",
    )
    tasks = planner.split_task_by_prompt(prompt)

    for task in tasks:
        sql_result, task_filename = sql_generator.generate_sql_by_prompt(task)
        df, error = dune_client.execute_query(sql_result)
        print(type(df))

        df_path = os.path.join(result_dir, task_filename)
        if not error and df is not None:
            df.to_csv(df_path, index=False)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--prompt",
        default="0x5e89f8d81c74e311458277ea1be3d3247c7cd7d1 这个钱包在买卖1inch上是否都有成功逃顶",
        type=str,
    )
    parser.add_argument(
        "--result_dir",
        default="results",
        type=str,
    )
    args = parser.parse_args()
    main(args.prompt, args.result_dir)
