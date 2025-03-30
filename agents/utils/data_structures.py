from pydantic import BaseModel


class Table(BaseModel):
    table_name: str
    description: str


class FullTable(BaseModel):
    table_name: str
    description: str
    columns: dict
