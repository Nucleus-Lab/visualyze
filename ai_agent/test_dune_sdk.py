import os
import logging

from dotenv import load_dotenv
from utils.dune_client import DuneQueryClient

# 设置日志级别
logging.basicConfig(level=logging.INFO)

load_dotenv()

def test_ethereum_transactions_query():
    # 使用环境变量中的API key初始化客户端
    api_key = os.getenv("DUNE_API_KEY")
    client = DuneQueryClient(api_key=api_key)
    
    # SQL查询
    sql = """
    SELECT 
    DATE_TRUNC('day', block_time) AS date,
    SUM(value / 1e18) AS total_volume_eth
    FROM ethereum.transactions
    WHERE block_time >= NOW() - INTERVAL '7' day
    GROUP BY 1
    ORDER BY 1 DESC
    """
    
    # 执行查询
    results_df, error = client.create_and_execute_query(sql)
    
    if error:
        print(f"查询出错: {error}")
    else:
        print("\n查询结果:")
        print(results_df)

if __name__ == "__main__":
    test_ethereum_transactions_query()
