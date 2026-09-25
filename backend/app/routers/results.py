from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import AnonSession, Result
from app.schemas import ResultIn, ResultOut

router = APIRouter(tags=["results"])


@router.post("/results", status_code=201, response_model=ResultOut)
async def create_result(payload: ResultIn, session: AsyncSession = Depends(get_session)) -> ResultOut:
    if await session.get(AnonSession, payload.anon_id) is None:
        session.add(AnonSession(id=payload.anon_id))

    result = Result(anon_id=payload.anon_id, test_id=payload.test_id, metrics=payload.metrics)
    session.add(result)
    await session.commit()
    return ResultOut(id=result.id)
