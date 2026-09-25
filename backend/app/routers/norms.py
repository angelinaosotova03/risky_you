from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import KNOWN_TESTS, settings
from app.db import get_session
from app.models import Result
from app.schemas import AverageOut, NormOut, SampleOut, SamplesOut

router = APIRouter(tags=["norms"])


@router.get("/norms/{test_id}", response_model=NormOut)
async def get_norm(
    test_id: str,
    metric: str = Query(pattern=r"^[A-Za-z]{1,32}$"),
    value: float = Query(allow_inf_nan=False),
    session: AsyncSession = Depends(get_session),
) -> NormOut:
    if test_id not in KNOWN_TESTS:
        raise HTTPException(status_code=404, detail="unknown test")

    # Сравниваем только с первой попыткой каждого участника:
    # при повторах люди учатся, и это искажает нормы
    first_attempts = (
        select(func.min(Result.id)).where(Result.test_id == test_id).group_by(Result.anon_id)
    )
    metric_value = Result.metrics[metric].as_float()
    base = (
        select(func.count())
        .select_from(Result)
        .where(Result.id.in_(first_attempts), metric_value.is_not(None))
    )

    total = await session.scalar(base) or 0
    below = await session.scalar(base.where(metric_value < value)) or 0
    # Средний ранг: те, у кого значение совпадает с твоим, считаются наполовину
    # "ниже" — иначе все с одинаковым результатом получали бы процентиль,
    # как если бы были хуже друг друга (below/total систематически недооценивал бы их)
    equal = await session.scalar(base.where(metric_value == value)) or 0

    percentile = round(100 * (below + equal / 2) / total, 1) if total >= settings.min_norm_sample else None
    return NormOut(test_id=test_id, metric=metric, value=value, percentile=percentile, sample_size=total)


@router.get("/norms/{test_id}/average", response_model=AverageOut)
async def get_average(
    test_id: str,
    metric: str = Query(pattern=r"^[A-Za-z]{1,32}$"),
    session: AsyncSession = Depends(get_session),
) -> AverageOut:
    if test_id not in KNOWN_TESTS:
        raise HTTPException(status_code=404, detail="unknown test")

    first_attempts = (
        select(func.min(Result.id)).where(Result.test_id == test_id).group_by(Result.anon_id)
    )
    metric_value = Result.metrics[metric].as_float()
    base = (
        select(func.count(), func.avg(metric_value))
        .select_from(Result)
        .where(Result.id.in_(first_attempts), metric_value.is_not(None))
    )

    total, avg = (await session.execute(base)).one()
    total = total or 0
    average = round(avg, 1) if total >= settings.min_norm_sample and avg is not None else None
    return AverageOut(test_id=test_id, metric=metric, average=average, sample_size=total)


@router.get("/norms/{test_id}/sample", response_model=SampleOut)
async def get_sample(
    test_id: str,
    metric: str = Query(pattern=r"^[A-Za-z]{1,32}$"),
    # У холодного старта партнёров в Доверии/Ультиматуме порог ниже, чем у радара:
    # там нужна просто разумная выборка ответов, а не строгая статистическая значимость
    min_sample: int = Query(default=None, ge=1),
    session: AsyncSession = Depends(get_session),
) -> SampleOut:
    """Один случайный реальный ответ — используется как "партнёр" в Доверии и Ультиматуме."""
    if test_id not in KNOWN_TESTS:
        raise HTTPException(status_code=404, detail="unknown test")

    threshold = min_sample if min_sample is not None else settings.min_norm_sample
    first_attempts = (
        select(func.min(Result.id)).where(Result.test_id == test_id).group_by(Result.anon_id)
    )
    metric_value = Result.metrics[metric].as_float()
    pool = (
        select(metric_value)
        .select_from(Result)
        .where(Result.id.in_(first_attempts), metric_value.is_not(None))
    )

    total = await session.scalar(select(func.count()).select_from(pool.subquery())) or 0
    if total < threshold:
        return SampleOut(test_id=test_id, metric=metric, value=None, sample_size=total)

    value = await session.scalar(pool.order_by(func.random()).limit(1))
    return SampleOut(test_id=test_id, metric=metric, value=value, sample_size=total)


@router.get("/norms/{test_id}/samples", response_model=SamplesOut)
async def get_samples(
    test_id: str,
    metric: str = Query(pattern=r"^[A-Za-z]{1,32}$"),
    limit: int = Query(default=500, ge=1, le=500),
    min_sample: int = Query(default=None, ge=1),
    session: AsyncSession = Depends(get_session),
) -> SamplesOut:
    """Список реальных ответов — используется для гистограммы в Двух третях."""
    if test_id not in KNOWN_TESTS:
        raise HTTPException(status_code=404, detail="unknown test")

    threshold = min_sample if min_sample is not None else settings.min_norm_sample
    first_attempts = (
        select(func.min(Result.id)).where(Result.test_id == test_id).group_by(Result.anon_id)
    )
    metric_value = Result.metrics[metric].as_float()
    pool = (
        select(metric_value)
        .select_from(Result)
        .where(Result.id.in_(first_attempts), metric_value.is_not(None))
    )

    total = await session.scalar(select(func.count()).select_from(pool.subquery())) or 0
    if total < threshold:
        return SamplesOut(test_id=test_id, metric=metric, values=[], sample_size=total)

    values = (await session.scalars(pool.order_by(Result.id.desc()).limit(limit))).all()
    return SamplesOut(test_id=test_id, metric=metric, values=list(values), sample_size=total)
