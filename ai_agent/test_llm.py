#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
单点测试大模型的脚本
用于测试LLM客户端的各种功能，如自然语言转SQL、SQL优化等
"""

import os
import sys
import argparse
import logging
import json
from typing import Dict, Any, List, Optional
from utils.llm_client import LLMClient

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def setup_llm_client() -> LLMClient:
    """初始化LLM客户端"""
    # 从环境变量中获取API密钥和基础URL
    api_key = os.getenv("LLM_API_KEY")
    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("MODEL_NAME", "chatgpt-4o-latest")
    
    if not api_key:
        logger.error("缺少LLM API密钥，请在.env文件中设置LLM_API_KEY")
        sys.exit(1)
    
    if not base_url:
        logger.warning("未设置LLM_BASE_URL，将使用默认URL")
    
    try:
        client = LLMClient(api_key=api_key, base_url=base_url, model=model)
        logger.info(f"LLM客户端初始化成功，使用模型: {model}")
        return client
    except Exception as e:
        logger.error(f"初始化LLM客户端失败: {str(e)}")
        sys.exit(1)

def test_natural_language_to_sql(client: LLMClient, query: str) -> None:
    """测试自然语言转SQL功能"""
    try:
        logger.info(f"测试自然语言转SQL，查询: {query}")
        sql = client.natural_language_to_sql(query)
        print("\n===== 生成的SQL查询 =====")
        print(sql)
        print("========================\n")
        
        # 尝试提取查询参数
        logger.info("尝试从SQL中提取参数...")
        params = client.extract_query_parameters(sql)
        if params:
            print("===== 提取的参数 =====")
            print(json.dumps(params, indent=2, ensure_ascii=False))
            print("======================\n")
    except Exception as e:
        logger.error(f"自然语言转SQL测试失败: {str(e)}")

def test_optimize_sql(client: LLMClient, sql: str, error: str, original_query: str = None) -> None:
    """测试SQL优化功能"""
    try:
        logger.info(f"测试SQL优化，原始SQL: {sql}")
        logger.info(f"错误信息: {error}")
        if original_query:
            logger.info(f"原始自然语言查询: {original_query}")
            optimized_sql = client.optimize_sql(sql, error, original_query)
        else:
            optimized_sql = client.optimize_sql(sql, error)
        print("\n===== 优化后的SQL查询 =====")
        print(optimized_sql)
        print("============================\n")
    except Exception as e:
        logger.error(f"SQL优化测试失败: {str(e)}")

def test_explain_sql(client: LLMClient, sql: str) -> None:
    """测试SQL解释功能"""
    try:
        logger.info(f"测试SQL解释，SQL: {sql}")
        explanation = client.explain_sql(sql)
        print("\n===== SQL解释 =====")
        print(explanation)
        print("===================\n")
    except Exception as e:
        logger.error(f"SQL解释测试失败: {str(e)}")
        # 检查是否是因为方法不存在
        if "object has no attribute 'explain_sql'" in str(e):
            logger.error("LLMClient类中没有实现explain_sql方法")

def test_chat(client: LLMClient, message: str) -> None:
    """测试普通聊天功能"""
    try:
        logger.info(f"测试聊天功能，消息: {message}")
        system_prompt = """
        你是一个区块链和加密货币专家，能够回答与Dune Analytics、区块链数据分析相关的问题。
        请用中文回答问题，保持专业性和准确性。
        """
        
        # 尝试调用chat方法，如果不存在则使用natural_language_to_sql作为替代
        try:
            response = client.chat(message, system_prompt=system_prompt)
        except AttributeError:
            logger.warning("LLMClient类中没有实现chat方法，将使用manual_chat实现")
            # 手动实现简单聊天
            import openai
            openai_client = openai.OpenAI(api_key=client.api_key, base_url=client.base_url)
            response = openai_client.chat.completions.create(
                model=client.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=2000
            ).choices[0].message.content.strip()
            
        print("\n===== 聊天回复 =====")
        print(response)
        print("====================\n")
    except Exception as e:
        logger.error(f"聊天测试失败: {str(e)}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="大模型功能测试工具")
    parser.add_argument("--action", "-a", choices=["nl2sql", "optimize", "explain", "chat"], 
                       default="nl2sql", help="要测试的功能")
    parser.add_argument("--query", "-q", help="自然语言查询或SQL语句")
    parser.add_argument("--error", "-e", help="SQL错误信息，用于优化功能")
    parser.add_argument("--original-query", "-o", help="原始自然语言查询，用于SQL优化功能")
    parser.add_argument("--env-file", default=".env", help="环境变量文件路径")
    
    args = parser.parse_args()
    
    # 加载环境变量
    if os.path.exists(args.env_file):
        logger.info(f"从{args.env_file}加载环境变量")
        with open(args.env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key.strip()] = value.strip()
    else:
        logger.warning(f"环境变量文件{args.env_file}不存在")
    
    # 初始化LLM客户端
    client = setup_llm_client()
    
    # 执行对应的测试功能
    if args.action == "nl2sql":
        if not args.query:
            query = input("请输入自然语言查询: ")
        else:
            query = args.query
        test_natural_language_to_sql(client, query)
        
    elif args.action == "optimize":
        if not args.query:
            sql = input("请输入需要优化的SQL: ")
        else:
            sql = args.query
            
        if not args.error:
            error = input("请输入错误信息: ")
        else:
            error = args.error
            
        original_query = args.original_query
        if not original_query:
            original_query = input("请输入原始自然语言查询(可选，直接回车跳过): ") or None
            
        test_optimize_sql(client, sql, error, original_query)
        
    elif args.action == "explain":
        if not args.query:
            sql = input("请输入需要解释的SQL: ")
        else:
            sql = args.query
            
        test_explain_sql(client, sql)
        
    elif args.action == "chat":
        if not args.query:
            message = input("请输入聊天消息: ")
        else:
            message = args.query
            
        test_chat(client, message)

if __name__ == "__main__":
    main()
