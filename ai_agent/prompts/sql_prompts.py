"""
SQL-related prompts used by the LLM client for various SQL operations.
"""

# Prompt for converting natural language to SQL
SQL_GENERATION_PROMPT = """
你是一个专业的SQL专家，精通Dune Analytics数据库。你的任务是将用户的自然语言查询转换为准确的SQL查询语句。

请遵循以下规则：
1. 只输出SQL代码，不要包含任何解释或其他文本
2. 使用标准的SQL语法，适用于Dune Analytics数据库
3. 确保查询是高效的并针对区块链数据进行了优化
4. 如果查询涉及时间范围，请使用适当的时间函数
5. 确保查询结果易于理解和分析
6. 必须用Trino SQL语法, e.g. {TRINO_SQL_RULES}
7. 使用 {TOKEN_TRANSFER_TABLE} 或 {NFT_TABLE}
8. 如果字段当中有和sql语法冲突的词，要加上双引号，不用额外加其他的东西
"""

# Prompt for extracting parameters from SQL
PARAMETER_EXTRACTION_PROMPT = """
你是一个专业的SQL专家，精通Dune Analytics数据库。你的任务是从SQL查询中提取可能的参数，并将它们转换为JSON格式。

请遵循以下规则：
1. 识别SQL中可能需要参数化的部分，如日期范围、地址、令牌ID等
2. 对于每个参数，提供一个包含以下字段的JSON对象：
   - name: 参数名称
   - type: 参数类型 (text, number, date)
   - value: 参数的当前值
3. 将所有参数组织成一个JSON数组
4. 只返回JSON数组，不要包含任何其他文本或解释
5. 必须用Trino SQL语法, e.g. {TRINO_SQL_RULES}
6. 使用 {TOKEN_TRANSFER_TABLE} 或 {NFT_TABLE}

例如，如果SQL查询是：
SELECT * FROM ethereum.transactions WHERE block_time > '2023-01-01' AND from_address = '0x123'

你应该返回：
[
  {"name": "start_date", "type": "date", "value": "2023-01-01"},
  {"name": "address", "type": "text", "value": "0x123"}
]
"""

# Prompt for optimizing SQL queries
SQL_OPTIMIZATION_PROMPT = """
你是一个专业的SQL专家，精通Dune Analytics数据库。你的任务是优化或修复SQL查询，使其能够在Dune Analytics上成功执行。

请遵循以下规则：
1. 分析SQL查询和错误信息（如果提供）
2. 识别并修复语法错误、表名错误、列名错误等问题
3. 优化查询性能，减少不必要的操作
4. 确保查询结果清晰易懂
5. 只返回优化后的SQL代码，不要包含任何解释或其他文本
6. 必须用Trino SQL语法, e.g. {TRINO_SQL_RULES}
7. 如果字段当中有和sql语法冲突的词，要加上双引号，像是from,to 等

Dune Analytics表名格式说明：
- {TOKEN_TRANSFER_TABLE}
- {NFT_TABLE}
- 如果看到表名错误，请尝试使用这些格式

"""

# Prompt for explaining SQL queries
SQL_EXPLANATION_PROMPT = """
你是一个专业的SQL专家，精通Dune Analytics数据库和区块链数据。你的任务是用简单易懂的语言解释SQL查询的功能和逻辑。

请遵循以下规则：
1. 用简洁明了的语言解释查询的目的
2. 解释查询的主要组成部分和它们的作用
3. 指出查询可能返回的数据类型和格式
4. 如果查询包含复杂的函数或操作，请解释它们的作用
5. 使用中文回复
"""



NFT_TABLE = """
# `nft.transfers` Table Schema

This table contains information about NFT token transfers across different blockchains. Below is a description of each column in the dataset.

| Column Name          | Data Type                         | Description                                        |
|----------------------|-----------------------------------|----------------------------------------------------|
| `blockchain`         | `varchar`                         | Blockchain name                                    |
| `block_time`         | `timestamp(3) with time zone`     | UTC event block time                               |
| `block_month`        | `date`                            | Month of the block time                            |
| `block_date`         | `date`                            | Date of the block time                             |
| `block_number`       | `bigint`                          | Block number in which the transaction was executed |
| `token_standard`     | `varchar`                         | Token standard                                     |
| `transfer_type`      | `varchar`                         | Single or batch transfer of tokens                 |
| `evt_index`          | `integer`                         | Event index                                        |
| `contract_address`   | `varbinary`                       | NFT contract address                               |
| `token_id`           | `uint256`                         | ID of transferred token(s)                         |
| `amount`             | `uint256`                         | Amount of transferred tokens                       |
| `from`               | `varbinary`                       | Address that sent the token(s)                     |
| `to`                 | `varbinary`                       | Address that received the token(s)                 |
| `executed_by`        | `varbinary`                       | Address that executed the transaction              |
| `tx_hash`            | `varbinary`                       | Transaction hash                                   |
| `unique_transfer_id` | `varchar`                         | Unique transfer ID                                 |

"""


TOKEN_TRANSFER_TABLE = """
# `tokens.transfers` Table Schema

This table contains detailed information about token transfers across various blockchains. Below is a description of each column in the dataset.

| Column Name        | Data Type                         | Description                                         |
|--------------------|-----------------------------------|-----------------------------------------------------|
| `unique_key`       | `varchar`                         | Surrogate key to identify unique row                |
| `blockchain`       | `varchar`                         | The blockchain of the transfer                      |
| `block_month`      | `date`                            | The month of the block                              |
| `block_date`       | `date`                            | The date of the block                               |
| `block_time`       | `timestamp(3) with time zone`     | The time of the block                               |
| `block_number`     | `bigint`                          | The block number                                    |
| `tx_hash`          | `varbinary`                       | The transaction hash                                |
| `evt_index`        | `bigint`                          | The log event index of the transfer                 |
| `trace_address`    | `array(bigint)`                   | The trace address of the transfer                   |
| `token_standard`   | `varchar`                         | The token standard of the transfer                  |
| `tx_from`          | `varbinary`                       | The transaction sender                              |
| `tx_to`            | `varbinary`                       | The transaction receiver                            |
| `tx_index`         | `bigint`                          | The transaction index                               |
| `from`             | `varbinary`                       | The sender of the transfer                          |
| `to`               | `varbinary`                       | The receiver of the transfer                        |
| `contract_address` | `varbinary`                       | The contract address of the transfer                |
| `symbol`           | `varchar`                         | The token symbol transferred                        |
| `amount_raw`       | `uint256`                         | The raw amount of the transfer                      |
| `amount`           | `double`                          | The display amount of the transfer                  |
| `price_usd`        | `double`                          | The USD price used to calculate the amount_usd      |
| `amount_usd`       | `double`                          | The USD amount of the transfer                      |

"""

AGGREGATOR_TABLE = """
# `dex_aggregator.trades` Project Overview

This table provides an overview of different DEX aggregators, their versions, supported chains, and recent swap activity.

| Project       | Versions                     | # of Chains | Chains (partial)                                      | Swaps (7d) |
|---------------|-------------------------------|-------------|--------------------------------------------------------|------------|
| 1inch         | AR v2, AR v3, AR v4, AR v5, AR v6 | 10          | optimism, polygon, gnosis, ethereum, zksync, ...       | 993.8k     |
| 0x API        | 1, settler                    | 13          | mantle, bnb, optimism, fantom, avalanche_c, ...        | 823.3k     |
| kyberswap     | meta_2                        | 7           | polygon, avalanche_c, optimism, base, bnb, ...         | 333.5k     |
| odos          | 2                             | 4           | base, arbitrum, ethereum, optimism                     | 315.5k     |
| paraswap      | 4, 5, 6                        | 8           | ethereum, bnb, fantom, avalanche_c, polygon, ...       | 154.5k     |
| cow_protocol  | 1                             | 4           | arbitrum, gnosis, ethereum, base                       | 69.2k      |
| bebop         | blend, jam                    | 8           | scroll, zksync, base, optimism, arbitrum, ...          | 52.0k      |
| lifi          | 2                             | 2           | optimism, fantom                                       | 21.0k      |
| tokenlon      | 5                             | 1           | ethereum                                               | 3.1k       |
| DODO X        | 0                             | 6           | ethereum, bnb, polygon, arbitrum, base, optimism       | 1.9k       |
| yield_yak     | 1                             | 3           | arbitrum, mantle, avalanche_c                          | 940.0      |
"""









TRINO_SQL_RULES = """
以下是 **Trino SQL** 和 **MySQL** 之间的主要语法区别，以表格的形式展示：  

| **类别**         | **Trino SQL** | **MySQL** |
|-----------------|--------------|-----------|
| **数据类型** | 支持 `ARRAY`、`MAP`、`ROW` 等复杂数据类型 | 主要使用 `VARCHAR`、`TEXT`、`JSON`，不支持 `ARRAY`、`MAP` |
| **插入数据** | 仅支持 `INSERT INTO ... SELECT`，不支持 `INSERT INTO ... VALUES` | 支持 `INSERT INTO ... VALUES` |
| **更新数据** | 不支持 `UPDATE` | 支持 `UPDATE` |
| **删除数据** | 不支持 `DELETE` | 支持 `DELETE` |
| **事务支持** | 主要用于查询分析，不支持事务 | 支持事务（`BEGIN`、`COMMIT`、`ROLLBACK`） |
| **查询优化** | 依赖分布式查询优化，如 `DISTRIBUTED JOIN` | 主要依赖索引优化 |
| **LIMIT & OFFSET** | `LIMIT` 可用，但 `OFFSET` 可能表现不同 | `LIMIT` 和 `OFFSET` 均可用 |
| **窗口函数** | 支持 `ROW_NUMBER()`、`RANK()` 等 | 仅支持部分窗口函数（MySQL 8.0+） |
| **JSON 处理** | `json_parse()`、`json_extract()` | `JSON_EXTRACT()`、`->>` |
| **聚合函数** | `COUNT(*) FILTER (WHERE condition)` | 需要 `CASE WHEN` 处理 |
| **连接查询** | 默认 `JOIN` 是广播 `JOIN`，可使用 `DISTRIBUTED JOIN` | 传统 `INNER JOIN`、`LEFT JOIN` |
| **跨数据源查询** | 支持查询多个数据源（如 Hive、PostgreSQL、S3） | 仅支持 MySQL 数据库 |
| **权限管理** | 依赖外部系统（如 LDAP、Ranger） | 内置用户权限管理（`GRANT`、`REVOKE`） |
| **存储格式** | 支持 ORC、Parquet、JSON、CSV | 主要使用 InnoDB、MyISAM |
| **分区管理** | `SHOW PARTITIONS` | `PARTITION BY` 语法 |
| **索引** | 不支持索引，依赖分布式计算 | 支持 `INDEX`、`FULLTEXT` |
| **CTE（公用表表达式）** | `WITH` 语句可用 | MySQL 8.0+ 支持 `WITH` |
| **GROUP BY 语法** | `GROUP BY 1, 2` 允许按列索引分组 | 需要明确列名 |
| **HAVING 语法** | 标准 SQL 语法 | 标准 SQL 语法 |
| **存储过程** | 不支持存储过程 | 支持 `PROCEDURE`、`FUNCTION` |
| **触发器** | 不支持触发器 | 支持 `TRIGGER` |
| **外键约束** | 不支持外键 | 支持 `FOREIGN KEY` |
| **视图** | 支持 `CREATE VIEW` | 支持 `CREATE VIEW` |
| **物化视图** | 不支持 | MySQL 需要手动实现 |
| **用户管理** | 依赖外部身份验证 | `CREATE USER`、`GRANT` |
"""