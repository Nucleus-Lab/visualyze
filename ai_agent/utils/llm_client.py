import logging
import os
import time
from typing import Dict, Any, List, Optional
import openai
import json
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Import prompts directly
from prompts.sql_prompts import (
    SQL_GENERATION_PROMPT,
    PARAMETER_EXTRACTION_PROMPT,
    SQL_OPTIMIZATION_PROMPT,
    SQL_EXPLANATION_PROMPT,
    TRINO_SQL_RULES,
    TOKEN_TRANSFER_TABLE,
    NFT_TABLE
)

logger = logging.getLogger(__name__)

class LLMClient:
    """LLM客户端，负责自然语言处理和SQL生成"""
    
    def __init__(self, api_key: str = None, base_url: str = None, model: str = "chatgpt-4o-latest"):
        """
        初始化LLM客户端
        
        Args:
            api_key: LLM API密钥，如果不提供则从环境变量读取
            base_url: API基础URL，如果不提供则使用默认值
            model: 使用的模型名称
        """
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        if not self.api_key:
            raise ValueError("必须提供LLM API密钥")
        
        # 获取完整的API URL
        self.api_url = base_url or os.getenv("LLM_BASE_URL")
        
        # 构建完整的API URL
        if self.api_url:
            if not self.api_url.endswith("/"):
                self.api_url += "/"
            if not "v1" in self.api_url:
                self.api_url += "v1/"
            if not self.api_url.endswith("chat/completions"):
                self.api_url += "chat/completions"
        else:
            self.api_url = "https://api.openai.com/v1/chat/completions"
            
        logger.info(f"使用API URL: {self.api_url}")
        
        self.model = model
        logger.info(f"LLM客户端初始化成功，使用模型: {model}")
    
    def _make_chat_request(self, messages: List[Dict[str, str]], temperature: float = 0.1, max_tokens: int = 10000) -> str:
        """
        使用直接HTTP请求调用API
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            
        Returns:
            str: API响应内容
        """
        try:
            logger.info(f"使用直接HTTP请求调用API")
            
            # 准备请求数据
            data = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            # 准备请求头
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # 发送请求，添加重试逻辑
            for attempt in range(3):
                try:
                    logger.info(f"发送HTTP请求到: {self.api_url}, 尝试次数: {attempt+1}")
                    response = requests.post(
                        self.api_url,
                        json=data,
                        headers=headers,
                        timeout=30  # 设置超时时间
                    )
                    
                    logger.info(f"收到响应: 状态码={response.status_code}, 内容长度={len(response.text)}")
                    
                    # 检查响应
                    if response.status_code == 429:  # 速率限制
                        retry_after = int(response.headers.get("Retry-After", 5))
                        logger.warning(f"API速率限制，等待{retry_after}秒后重试")
                        time.sleep(retry_after)
                        continue
                        
                    if response.status_code not in [200, 201]:
                        logger.error(f"API请求失败: {response.status_code} - {response.text}")
                        if attempt < 2:  # 如果不是最后一次尝试
                            time.sleep(2 ** attempt)  # 指数退避
                            continue
                        return f"API URL ERROR: {response.status_code}"  # 返回一个错误消息而不是抛出异常
                    
                    # 解析响应
                    try:
                        result = response.json()
                        logger.info(f"成功解析JSON响应: {json.dumps(result, ensure_ascii=False)[:200]}...")
                    except Exception as json_e:
                        logger.error(f"无法解析API响应为JSON: {response.text[:200]}..., 错误: {str(json_e)}")
                        return f"API RESPONSE ERROR: {str(json_e)}"
                    
                    # 提取内容
                    if "choices" in result and len(result["choices"]) > 0:
                        if "message" in result["choices"][0] and "content" in result["choices"][0]["message"]:
                            content = result["choices"][0]["message"]["content"]
                            if content is not None:
                                logger.info(f"成功从API响应中提取内容，长度: {len(content)}")
                                return content.strip()
                    
                    logger.error(f"无法从API响应中提取内容: {json.dumps(result, ensure_ascii=False)[:200]}...")
                    return "API RESPONSE FORMAT ERROR"
                        
                except requests.RequestException as req_e:
                    logger.warning(f"HTTP请求异常: {str(req_e)}")
                    if attempt < 2:  # 如果不是最后一次尝试
                        time.sleep(2 ** attempt)  # 指数退避
                    else:
                        return f"API CONNECTION ERROR: {str(req_e)}"
            
            return "API REQUEST FAILED"
                
        except Exception as e:
            logger.exception(f"调用API时发生错误: {str(e)}")
            return f"API ERROR: {str(e)}"
    
    def _remove_markdown_code_block(self, text: str) -> str:
        """移除Markdown代码块标记
        
        Args:
            text: 包含可能的Markdown代码块标记的文本
            
        Returns:
            str: 清理后的文本
        """
        text = text.strip()
        if text.startswith("```"):
            text = text[text.find("\n")+1:]
        if text.endswith("```"):
            text = text[:text.rfind("```")]
        return text.strip()
        
    def natural_language_to_sql(self, query: str) -> str:
        """
        将自然语言查询转换为SQL查询
        
        Args:
            query: 自然语言查询
            
        Returns:
            str: 生成的SQL查询
        """
        logger.info(f"开始将自然语言转换为SQL: {query}")
        
        try:
            # 使用导入的提示并格式化
            system_prompt = SQL_GENERATION_PROMPT.format(
                TRINO_SQL_RULES=TRINO_SQL_RULES,
                TOKEN_TRANSFER_TABLE=TOKEN_TRANSFER_TABLE,
                NFT_TABLE=NFT_TABLE
            )
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请将以下自然语言查询转换为SQL查询：{query}"}
            ]
            
            sql_query = self._make_chat_request(messages)
            sql_query = self._remove_markdown_code_block(sql_query)
            logger.info(f"生成的SQL查询: {sql_query}")
            return sql_query
            
        except Exception as e:
            logger.error("生成SQL时发生错误", exc_info=True)
            raise Exception(f"生成SQL时出现错误: {str(e)}")
    
    def extract_parameters(self, sql: str) -> List[Dict[str, Any]]:
        """
        从SQL查询中提取参数
        
        Args:
            sql: SQL查询
            
        Returns:
            List[Dict[str, Any]]: 参数列表
        """
        logger.info(f"开始从SQL中提取查询参数")
        
        try:
            # 使用导入的提示并格式化
            system_prompt = PARAMETER_EXTRACTION_PROMPT.format(
                TRINO_SQL_RULES=TRINO_SQL_RULES,
                TOKEN_TRANSFER_TABLE=TOKEN_TRANSFER_TABLE,
                NFT_TABLE=NFT_TABLE
            )
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请从以下SQL查询中提取参数:\n{sql}"}
            ]
            
            response = self._make_chat_request(messages)
            
            # 尝试解析返回的JSON
            try:
                # 提取JSON部分
                json_str = response
                # 如果响应包含```json和```，则提取中间部分
                if "```json" in json_str and "```" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                # 如果响应包含```和```，则提取中间部分
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0].strip()
                
                parameters = json.loads(json_str)
                if not isinstance(parameters, list):
                    logger.warning(f"参数不是列表格式: {parameters}")
                    return []
                
                return parameters
            except Exception as e:
                logger.warning(f"无法解析参数JSON，返回空列表: {str(e)}")
                return []
                
        except Exception as e:
            logger.error("提取参数时发生错误", exc_info=True)
            return []
    
    def optimize_sql(self, sql: str, error_message: str = None, original_query: str = None) -> str:
        """
        优化SQL查询，特别是当原始查询失败时
        
        Args:
            sql: 原始SQL查询
            error_message: 错误消息（如果有）
            original_query: 原始自然语言查询（可选）
            
        Returns:
            str: 优化后的SQL查询
        """
        logger.info(f"开始优化SQL。错误信息: {error_message}")
        
        try:
            # 使用导入的提示并格式化
            system_prompt = SQL_OPTIMIZATION_PROMPT.format(
                TRINO_SQL_RULES=TRINO_SQL_RULES,
                TOKEN_TRANSFER_TABLE=TOKEN_TRANSFER_TABLE,
                NFT_TABLE=NFT_TABLE
            )
            
            # 处理错误信息
            error_context = ""
            if error_message:
                # 检查是否包含ExecutionState.FAILED
                if "ExecutionState.FAILED" in error_message:
                    error_context = f"查询执行失败，详细错误信息:\n{error_message}\n\n可能是表名不正确，请检查表名格式。"
                else:
                    error_context = f"查询执行时出现以下错误:\n{error_message}"
            else:
                error_context = "查询执行失败，但没有提供具体错误信息。请检查语法和表名是否正确。"
            
            user_content = f"请优化或修复以下SQL查询:\n```sql\n{sql}\n```\n\n{error_context}"
            
            if original_query:
                user_content += f"\n\n原始自然语言查询是: {original_query}"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
            
            # 记录传送给模型的完整内容
            logger.info("==== 传送给优化SQL模型的内容 ====")
            logger.info(f"系统提示: {system_prompt}")
            logger.info(f"用户内容: {user_content}")
            logger.info("==== 内容结束 ====")
            
            optimized_sql = self._make_chat_request(messages)
            optimized_sql = self._remove_markdown_code_block(optimized_sql)
            logger.info(f"优化后的SQL查询: {optimized_sql}")
            return optimized_sql
            
        except Exception as e:
            logger.error("优化SQL时发生错误", exc_info=True)
            raise Exception(f"优化SQL时出现错误: {str(e)}")
    
    def explain_sql(self, sql: str) -> str:
        """
        解释SQL查询的功能和逻辑
        
        Args:
            sql: SQL查询
            
        Returns:
            str: SQL查询的解释
        """
        logger.info(f"开始生成SQL解释")
        
        try:
            # 使用导入的提示
            system_prompt = SQL_EXPLANATION_PROMPT
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请解释以下SQL查询的功能和逻辑:\n{sql}"}
            ]
            
            explanation = self._make_chat_request(messages, temperature=0.7)
            
            logger.info("SQL解释生成成功")
            return explanation
            
        except Exception as e:
            logger.error("生成SQL解释时发生错误", exc_info=True)
            raise Exception(f"生成SQL解释时出现错误: {str(e)}")
    
    def chat(self, messages: List[Dict[str, str]], system_prompt: str = None) -> str:
        """
        与LLM进行聊天交互
        
        Args:
            messages: 消息历史
            system_prompt: 系统提示（可选）
            
        Returns:
            str: LLM的回复
        """
        try:
            # 如果提供了系统提示，将其添加到消息列表的开头
            if system_prompt:
                full_messages = [{"role": "system", "content": system_prompt}] + messages
            else:
                full_messages = messages
            
            reply = self._make_chat_request(full_messages, temperature=0.7)
            
            logger.info("聊天回复生成成功")
            return reply
            
        except Exception as e:
            logger.error("生成聊天回复时发生错误", exc_info=True)
            raise Exception(f"生成聊天回复时出现错误: {str(e)}")
