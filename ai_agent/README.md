# AI Dune 自然语言查询工具

这是一个基于自然语言查询Dune Analytics数据库的工具，使用GPT将自然语言转换为SQL查询，并通过Dune的Python SDK执行查询。

## 主要功能

1. **自然语言到SQL转换**：使用先进的GPT模型将自然语言查询转换为适用于Dune的SQL查询
2. **SQL优化**：根据Dune返回的错误信息自动优化SQL查询
3. **查询结果解释**：自动为查询结果生成易于理解的解释
4. **命令行和Web界面**：同时支持命令行和Web界面两种交互方式

## 环境配置

项目使用conda虚拟环境`ai_dune`，依赖以下主要库：

- dune-client: Dune Analytics Python SDK
- openai: OpenAI API客户端
- flask: Web应用框架
- python-dotenv: 环境变量管理
- pandas: 数据处理

## 安装与设置

1. 克隆仓库并进入项目目录

```bash
git clone <repository-url>
cd ai_dune
```

2. 使用conda创建并激活虚拟环境

```bash
conda create -n ai_dune python=3.10
conda activate ai_dune
```

3. 安装依赖

```bash
pip install -r requirements.txt
```

4. 创建`.env`文件并设置API密钥

```
DUNE_API_KEY=your_dune_api_key
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://www.gptapi.us/
MODEL_NAME=chatgpt-4o-latest
```

## 使用方法

### Web界面

1. 启动Web服务器：

```bash
python app.py
```

2. 在浏览器中访问 http://localhost:5000

3. 在文本框中输入您的自然语言查询，例如"过去一周以太坊的每日交易量是多少？"

### 命令行界面

```bash
python app.py --cli
```

然后在命令行中输入您的查询即可。

## API参考

### Dune Python SDK

本项目使用了Dune的官方Python SDK，详细文档请参考：
- [Dune API 文档](https://docs.dune.com/api-reference/)
- [Dune Client GitHub](https://github.com/duneanalytics/dune-client)

## 注意事项

- 查询执行可能需要一些时间，特别是对于复杂查询
- API密钥需要保密，不应该提交到版本控制系统中
- 使用`query_parameters`字段传递参数，而不是直接使用`parameters`字段
- Dune Analytics的查询管理功能（如`create_query`）仅在付费计划中可用
- SQL查询必须使用正确的Trino SQL语法，特别是对于时间间隔：
  - 正确: `INTERVAL '7' day`, `INTERVAL '3' hour`, `INTERVAL '1' month`
  - 错误: `INTERVAL '7 days'`, `INTERVAL '3 hours'`
- 建议使用`NOW()`而不是`CURRENT_TIMESTAMP`来获取当前时间
- 对于ETH的值转换，直接使用`value / 1e18`而不是`CAST(value AS DOUBLE) / 1e18`

## 常见问题解决

### 1. 创建查询失败

如果遇到"Query management endpoints are only available in our paid plans"错误，这意味着您需要升级到Dune Analytics的付费计划。

### 2. SQL语法错误

常见的SQL语法问题：
- 时间间隔格式不正确
- 使用了不支持的SQL函数
- 表名或列名错误

### 3. 查询超时

对于大型查询：
- 添加适当的时间范围限制
- 使用更高效的聚合函数
- 避免不必要的子查询

## 代码示例

### 基本查询示例

```python
from utils.dune_client import DuneQueryClient

# 初始化客户端
client = DuneQueryClient(api_key="your_api_key")

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
```

## 更新日志

### 2025-03-26
- 优化了错误处理逻辑
- 改进了SQL语法检查
- 添加了更详细的日志记录
- 修复了Markdown代码块标记问题

## 贡献指南

1. Fork 项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详细信息
