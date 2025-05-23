import dspy
from dotenv import load_dotenv
import os
import logging
import pandas as pd
from agents.sql_generator import SqlGenerateAgent
from agents.utils.dune_client import DuneQueryClient
from agents.planner import Planner
from agents.plotter import PlotterAgent
import concurrent.futures
from agents.figure_analyzer import AnalyzeFigureAgent

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


def plot_graph(prompt: str, task: str, csv_filepath: str):
    df = pd.read_csv(csv_filepath)
    description = df.describe()
    sample_data = df.head(5)
    plotter = PlotterAgent()

    file_name = os.path.basename(csv_filepath)
    file_name = "/data/" + file_name
    viz_code = plotter.plot_by_prompt(prompt, task, file_name, description, sample_data)
    return viz_code


def analyze_figure(prompt: str, attachments: list[str]):
    analyzer = AnalyzeFigureAgent()
    return analyzer.analyze_figures(attachments, prompt)


def generate_figures(prompt: str, csv_dir: str, viz_dir: str):
    os.makedirs(csv_dir, exist_ok=True)
    os.makedirs(viz_dir, exist_ok=True)

    planner = Planner()
    sql_generator = SqlGenerateAgent(
        table_list_file_path="agents/utils/table_list.json",
    )

    # sql = sql_generator.generate_sql_by_prompt_with_full_table(prompt)
    # print(f"The generated Trino SQL query: {sql}")

    # tasks = planner.split_task_by_prompt(prompt, sql_generator.full_table_list)
    tasks = planner.split_task_by_prompt(prompt)
    results = []

    def process_task(task, sql_generator, dune_client, csv_dir, viz_dir, prompt):
        result = {"task": task, "result": "failed"}

        sql_result, output_filename, table_detail = (
            sql_generator.generate_sql_by_prompt(task)
        )
        task_filename = os.path.basename(output_filename).replace(".csv", "")
        msg = f"✅Processing task: {task}"
        msg += f"\n✅SQL Result: {sql_result}"
        msg += f"\n✅Task Filename: {task_filename}"
        print(msg)

        df, error = dune_client.execute_query(sql_result)

        if error:
            print(f"❌Error: {error}")
            refined_sql = sql_generator.retry_generate_sql_by_prompt(
                task, sql_result, error, table_detail
            )
            print(f"✅Refined SQL: {refined_sql}")
            df, error = dune_client.execute_query(refined_sql)

        # if still error, skip the task
        if error:
            print(f"❌Error: {error}")
            result["error"] = error
            return result

        print(f"✅Successfully executed query: {task_filename}")

        # if df is empty, skip the task
        if df.empty:
            print(f"❌Error: {error}")
            result["result"] = "No information found for this task"
            return result

        csv_path = os.path.join(csv_dir, f"{task_filename}.csv")
        if df is not None:
            df.to_csv(csv_path, index=False)
            viz_path = os.path.join(viz_dir, f"{task_filename}.js")
            if df is not None:
                viz_code = plot_graph(prompt, task, csv_path)
                with open(viz_path, "w") as f:
                    f.write(viz_code)
                result["file_name"] = task_filename
                result["result"] = "success"
        else:
            result["result"] = "No information found for this task"
            return result

        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(
                process_task, task, sql_generator, dune_client, csv_dir, viz_dir, prompt
            )
            for task in tasks
        ]
        
        # Add 1 minute timeout
        try:
            # Set a timeout for the entire group of futures
            completed_futures = []
            for future in concurrent.futures.as_completed(futures, timeout=60):
                try:
                    result = future.result()
                    completed_futures.append(future)
                    if result.get('result') == 'failed':
                        print(f"❌ Task failed with error: {result.get('error')}")
                    else:
                        results.append(result)
                        print(f"✅ Task completed successfully: {result.get('task', 'Unknown')[:50]}...")
                except Exception as e:
                    print(f"❌ Task failed with error: {str(e)}")
        except concurrent.futures.TimeoutError:
            print("❌ Timeout reached after 1 minute. Cancelling remaining tasks...")
            # Cancel any pending futures
            timed_out_futures = [f for f in futures if f not in completed_futures]
            print(f"⏱️ {len(timed_out_futures)} tasks timed out and will be cancelled")
            
            # Get results from completed tasks only
            for future in completed_futures:
                if future.done() and not future.cancelled():
                    try:
                        if future.result() not in results:  # Avoid duplicates
                            results.append(future.result())
                    except Exception as e:
                        print(f"❌ Error retrieving result: {str(e)}")
            
            # Cancel remaining tasks and force terminate Dune client connections
            for future in timed_out_futures:
                future.cancel()
            
            # Force stop any ongoing Dune client operations
            try:
                # This will depend on how your DuneQueryClient is implemented
                dune_client.terminate_all_queries()
                print("🛑 Terminated all ongoing Dune client queries")
            except Exception as e:
                print(f"⚠️ Could not terminate Dune client queries: {str(e)}")

    return results


def main(prompt: str, csv_dir: str, viz_dir: str, attachments: list[str] = None):
    if attachments:
        return analyze_figure(prompt, attachments)
    else:
        return generate_figures(prompt, csv_dir, viz_dir)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--prompt",
        default="0x5e89f8d81c74e311458277ea1be3d3247c7cd7d1 这个钱包在买卖1inch上是否都有成功逃顶",
        type=str,
    )
    parser.add_argument(
        "--csv_dir",
        default="data/csv",
        type=str,
    )
    parser.add_argument(
        "--viz_dir",
        default="data/viz",
        type=str,
    )
    args = parser.parse_args()
    main(args.prompt, args.csv_dir, args.viz_dir)
