import logging
from typing import Tuple, List, Dict, Any, Optional, Union
import os
import time
import pandas as pd
from dune_client.client import DuneClient
from dune_client.query import QueryBase
from dune_client.types import QueryParameter
from dune_client.models import QueryFailed  # 导入正确的异常类

logger = logging.getLogger(__name__)

class DuneQueryClient:
    """Dune查询客户端，负责执行SQL查询并处理结果"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("DUNE_API_KEY")
        if not self.api_key:
            raise ValueError("必须提供Dune API密钥")
        
        self.client = DuneClient(api_key=self.api_key)
        logger.info("Dune客户端初始化成功")
    
    def execute_query(self, sql: str, query_params: List[Dict[str, Any]] = None) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        执行SQL查询并返回结果
        
        Args:
            sql: 要执行的SQL查询语句
            query_params: 查询参数列表，每个参数是一个字典，包含name、type和value
            
        Returns:
            tuple: (查询结果列表, 错误信息(如果有))
        """
        try:
            logger.info(f"开始执行SQL查询: {sql}")
            
            # 使用create_and_execute_query方法创建并执行查询
            results_df, error = self.create_and_execute_query(sql, query_params)
            
            if error:
                return [], error
            
            # 将DataFrame转换为字典列表
            results = results_df.to_dict(orient='records')
            logger.info(f"查询执行成功，返回{len(results)}条结果")
            return results, None
                
        except Exception as e:
            logger.exception("执行查询时发生未预期的错误")
            return [], f"执行查询时出现错误: {str(e)}"
    
    def create_and_execute_query(self, sql: str, query_params: List[Dict[str, Any]] = None) -> Tuple[pd.DataFrame, Optional[str]]:
        """
        创建并执行新的查询
        
        Args:
            sql: SQL查询
            query_params: 查询参数
            
        Returns:
            tuple: (DataFrame结果, 错误信息(如果有))
        """
        try:
            # 处理查询参数
            parameters = self._process_query_parameters(query_params) if query_params else []
            
            # 创建新查询
            logger.info(f"正在创建新查询: {sql}")
            logger.debug(f"完整SQL查询: \n{sql}")
            
            query = self._create_query(sql, parameters)
            if isinstance(query, str):  # 如果返回的是错误信息
                return pd.DataFrame(), query
                
            # 执行查询并获取结果
            results_df = self._execute_query(query.base)
            if isinstance(results_df, tuple):  # 如果返回的是(DataFrame, error)
                return results_df
                
            return results_df, None
                
        except Exception as e:
            logger.exception("执行查询时发生未预期的错误")
            return pd.DataFrame(), f"执行查询时出现错误: {str(e)}"
            
    def _process_query_parameters(self, query_params: List[Dict[str, Any]]) -> List[QueryParameter]:
        """处理查询参数"""
        parameters = []
        for param in query_params:
            name = param.get('name')
            param_type = param.get('type')
            value = param.get('value')
            
            if not all([name, param_type, value]):
                logger.warning(f"参数不完整: {param}")
                continue
            
            try:
                if param_type == 'text':
                    parameters.append(QueryParameter.text_type(name=name, value=value))
                elif param_type == 'number':
                    parameters.append(QueryParameter.number_type(name=name, value=float(value)))
                elif param_type == 'date':
                    parameters.append(QueryParameter.date_type(name=name, value=value))
                elif param_type == 'enum':
                    parameters.append(QueryParameter.enum_type(name=name, value=value))
                else:
                    logger.warning(f"不支持的参数类型: {param_type}")
            except Exception as e:
                logger.warning(f"处理参数时出错: {str(e)}")
                
        return parameters
        
    def _create_query(self, sql: str, parameters: List[QueryParameter]) -> Union[QueryBase, str]:
        """创建新查询"""
        try:
            query = self.client.create_query(
                name="AI生成查询",
                query_sql=sql,
                params=parameters,
                is_private=False
            )
            
            query_id = query.base.query_id
            logger.info(f"创建查询成功，查询ID: {query_id}")
            return query
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"创建查询失败: {error_msg}")
            
            # 尝试提取更详细的错误信息
            detailed_error = self._extract_detailed_error(error_msg)
            
            # 如果没有详细错误信息，提供一些常见错误的可能性
            if detailed_error == error_msg or "Error data: None" in detailed_error:
                detailed_error = f"创建查询失败: {error_msg}。可能的原因：\n" \
                               f"1. 表名错误 - Dune Analytics中的表名可能是 'opensea_v4.trades', 'opensea_v3.trades' 或其他格式\n" \
                               f"2. 列名错误 - 请检查列名是否正确，例如可能是 'amount_usd' 而不是 'price_usd'\n" \
                               f"3. 语法错误 - 请检查SQL语法是否符合Dune Analytics的要求\n" \
                               f"4. 权限问题 - 某些表可能需要特定权限\n" \
                               f"5. 查询复杂度 - 查询可能太复杂或数据量太大"
            
            logger.error(f"失败的SQL查询: {sql}")
            return detailed_error
            
    def _execute_query(self, query: QueryBase) -> Union[pd.DataFrame, Tuple[pd.DataFrame, str]]:
        """执行查询并获取结果"""
        try:
            results_df = self.client.run_query_dataframe(query=query)
            logger.info(f"查询执行成功，返回{len(results_df)}行结果")
            logger.info("results_df:")
            logger.info(results_df)
            return results_df
            
        except QueryFailed as e:
            error_msg = str(e)
            try:
                # 从错误消息中提取执行ID
                import re
                execution_id_match = re.search(r'execution_id=([^,]+)', error_msg)
                if execution_id_match:
                    execution_id = execution_id_match.group(1)
                    status = self.client.get_execution_status(execution_id)
                    logger.info(f"查询状态: {status}")
                    error_msg = f"ExecutionState.FAILED: execution_id={execution_id}, query_id={query.query_id}, error={status.error}"
            except Exception as status_error:
                logger.warning(f"获取详细状态失败: {str(status_error)}")
                
            logger.error(f"查询执行失败: {error_msg}")
            return pd.DataFrame(), error_msg
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"查询执行失败: {error_msg}")
            return pd.DataFrame(), error_msg
    
    def get_query_execution_status(self, execution_id: str) -> Dict[str, Any]:
        """
        获取查询执行状态
        
        Args:
            execution_id: 查询执行ID
            
        Returns:
            dict: 查询状态信息
        """
        try:
            # 获取查询状态
            status = self.client.get_status(execution_id)
            return status
            
        except Exception as e:
            logger.exception("获取查询状态时发生错误")
            return {"status": "error", "error": str(e)}
    
    def _extract_detailed_error(self, error_msg: str) -> str:
        """
        从Dune API的错误信息中提取更详细的错误信息
        
        Args:
            error_msg: 原始错误信息
            
        Returns:
            str: 提取后的详细错误信息
        """
        try:
            # 导入re模块
            import re
            
            # 记录原始错误信息
            logger.debug(f"正在分析错误信息: {error_msg}")
            
            # 如果错误信息包含"ExecutionState.FAILED"，说明是执行失败
            if "ExecutionState.FAILED" in error_msg:
                # 提取查询ID和执行ID
                execution_id_match = re.search(r'execution_id=([^,]+)', error_msg)
                query_id_match = re.search(r'query_id=([^,]+)', error_msg)
                
                execution_id = execution_id_match.group(1) if execution_id_match else "未知"
                query_id = query_id_match.group(1) if query_id_match else "未知"
                
                logger.info(f"查询执行失败，执行ID: {execution_id}, 查询ID: {query_id}")
                
                # 尝试获取更详细的执行错误信息
                try:
                    status = self.get_query_execution_status(execution_id)
                    logger.debug(f"查询状态详情: {status}")
                    
                    if status and isinstance(status, dict):
                        state = status.get("state")
                        error_data = status.get("error")
                        
                        if error_data:
                            logger.info(f"找到错误数据: {error_data}")
                            return f"查询执行失败: {error_data}"
                        elif state:
                            logger.info(f"查询状态: {state}")
                            return f"查询执行失败，状态: {state}"
                except Exception as e:
                    logger.warning(f"获取详细错误信息失败: {str(e)}")
            
            # 检查是否包含SQL语法错误
            sql_error_patterns = [
                (r'syntax error at or near "([^"]+)"', "SQL语法错误，在 {} 附近"),
                (r'column "([^"]+)" does not exist', "列 {} 不存在"),
                (r'relation "([^"]+)" does not exist', "表 {} 不存在"),
                (r'invalid input syntax for type ([^:]+)', "输入语法对类型 {} 无效"),
                (r'permission denied for ([^:]+)', "没有 {} 的权限")
            ]
            
            for pattern, template in sql_error_patterns:
                match = re.search(pattern, error_msg, re.IGNORECASE)
                if match:
                    logger.info(f"匹配到SQL错误模式: {pattern}")
                    return template.format(match.group(1))
            
            # 如果没有匹配到特定模式，返回原始错误信息
            return error_msg
            
        except Exception as e:
            logger.exception("分析错误信息时出现异常")
            return error_msg
