from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, FiniteFloat, StringConstraints, field_validator

from app.config import KNOWN_TESTS

MetricName = Annotated[str, StringConstraints(pattern=r"^[A-Za-z]{1,32}$")]


class ResultIn(BaseModel):
    anon_id: UUID
    test_id: str
    metrics: dict[MetricName, FiniteFloat] = Field(min_length=1, max_length=10)

    @field_validator("test_id")
    @classmethod
    def known_test(cls, value: str) -> str:
        if value not in KNOWN_TESTS:
            raise ValueError("unknown test")
        return value


class ResultOut(BaseModel):
    id: int


class NormOut(BaseModel):
    test_id: str
    metric: str
    value: float
    # Доля участников с меньшим значением, в процентах. None — данных пока мало.
    percentile: float | None
    sample_size: int


class AverageOut(BaseModel):
    test_id: str
    metric: str
    # Среднее по первым попыткам всех участников. None — данных пока мало.
    average: float | None
    sample_size: int


class SampleOut(BaseModel):
    test_id: str
    metric: str
    # Один случайный реальный ответ (для симуляции партнёра). None — данных пока мало.
    value: float | None
    sample_size: int


class SamplesOut(BaseModel):
    test_id: str
    metric: str
    # Последние значения метрики (для гистограммы). Пусто — данных пока мало.
    values: list[float]
    sample_size: int
