import os
import logging
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from utils.dune_client import DuneQueryClient
from utils.llm_client import LLMClient


# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)

# 初始化客户端
dune_client = DuneQueryClient(api_key=os.getenv("DUNE_API_KEY"))
llm_client = LLMClient(
    api_key=os.getenv("LLM_API_KEY"),
    base_url=os.getenv("LLM_BASE_URL"),
    model=os.getenv("MODEL_NAME", "chatgpt-4o-latest")
)

@app.route('/')
def index():
    """首页路由"""
    return render_template('index.html')

@app.route('/api/query', methods=['POST'])
def handle_query():
    """处理自然语言查询的API端点"""
    try:
        data = request.json
        natural_language_query = data.get('query', '')
        
        if not natural_language_query:
            return jsonify({"error": "查询不能为空"}), 400
        
        logger.info(f"接收到自然语言查询: {natural_language_query}")
        
        # 第一步：通过LLM将自然语言转换为SQL
        sql_query = llm_client.natural_language_to_sql(natural_language_query)
        logger.info(f"生成的SQL查询: {sql_query}")
        
        # 第二步：执行SQL查询
        query_result, error = dune_client.execute_query(sql_query)
        
        # 如果有错误，通过LLM优化SQL
        if error:
            logger.info(f"查询执行出错: {error}")
            optimized_sql = llm_client.optimize_sql(sql_query, error, natural_language_query)
            logger.info(f"优化后的SQL查询: {optimized_sql}")
            
            # 再次执行优化后的SQL
            query_result, error = dune_client.execute_query(optimized_sql)
            
            # 如果仍然有错误，返回错误信息
            if error:
                logger.error(f"优化后的SQL仍然执行出错: {error}")
                return jsonify({
                    "error": f"查询执行失败: {error}",
                    "original_sql": sql_query,
                    "optimized_sql": optimized_sql
                }), 500
            
            return jsonify({
                "result": query_result,
                "original_sql": sql_query,
                "optimized_sql": optimized_sql
            })
        
        # 没有错误，直接返回结果
        return jsonify({
            "result": query_result,
            "sql": sql_query
        })
        
    except Exception as e:
        logger.exception("处理查询时出现异常")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

@app.route('/api/explain', methods=['POST'])
def explain_result():
    """解释查询结果的API端点"""
    try:
        data = request.json
        query_result = data.get('result', [])
        natural_language_query = data.get('query', '')
        
        if not query_result or not natural_language_query:
            return jsonify({"error": "结果或查询不能为空"}), 400
        
        # 使用LLM解释查询结果
        explanation = llm_client.explain_results(natural_language_query, query_result)
        
        return jsonify({
            "explanation": explanation
        })
        
    except Exception as e:
        logger.exception("解释结果时出现异常")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

# 命令行接口
def cli_interface():
    """命令行接口，用于直接在命令行使用自然语言查询"""
    print("欢迎使用AI Dune查询系统 (输入'退出'以结束)")
    
    while True:
        query = input("\n请输入您的自然语言查询: ")
        
        if query.lower() in ['退出', 'exit', 'quit']:
            print("谢谢使用，再见！")
            break
        
        try:
            # 通过LLM将自然语言转换为SQL
            sql_query = llm_client.natural_language_to_sql(query)
            print(f"\n生成的SQL查询: \n{sql_query}\n")
            
            # 执行SQL查询
            query_result, error = dune_client.execute_query(sql_query)
            
            # 如果有错误，通过LLM优化SQL
            if error:
                print(f"查询执行出错: {error}")
                optimized_sql = llm_client.optimize_sql(sql_query, error, query)
                print(f"\n优化后的SQL查询: \n{optimized_sql}\n")
                
                # 再次执行优化后的SQL
                query_result, error = dune_client.execute_query(optimized_sql)
                
                # 如果仍然有错误，返回错误信息
                if error:
                    print(f"优化后的SQL仍然执行出错: {error}")
                    continue
            
            # 打印结果
            print("\n查询结果:")
            for row in query_result:
                print(row)
            
            # 提供解释
            explanation = llm_client.explain_results(query, query_result)
            print(f"\n结果解释: \n{explanation}")
            
        except Exception as e:
            print(f"发生错误: {str(e)}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        cli_interface()
    else:
        app.run(debug=True, host='0.0.0.0', port=5000)
