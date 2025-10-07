from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/collections", response_model=list[schemas.Collection])
def list_collections(db: Session = Depends(get_db)):
    collections = (
        db.query(models.Collection)
        .options(selectinload(models.Collection.favorites))
        .order_by(models.Collection.created_at.desc())
        .all()
    )
    return collections


@router.post("/collections", response_model=schemas.Collection, status_code=status.HTTP_201_CREATED)
def create_collection(payload: schemas.CollectionCreate, db: Session = Depends(get_db)):
    collection = models.Collection(**payload.dict())
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


@router.delete("/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.get(models.Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="收藏夹不存在")

    db.delete(collection)
    db.commit()
    return None


@router.post(
    "/collections/{collection_id}/favorites",
    response_model=schemas.FavoriteVideo,
    status_code=status.HTTP_201_CREATED,
)
def add_favorite(collection_id: int, payload: schemas.FavoriteVideoCreate, db: Session = Depends(get_db)):
    collection = db.get(models.Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="收藏夹不存在")

    existed = (
        db.query(models.FavoriteVideo)
        .filter_by(collection_id=collection_id, video_id=payload.video_id)
        .first()
    )
    if existed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该视频已收藏")

    favorite = models.FavoriteVideo(collection_id=collection_id, **payload.dict())
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(favorite_id: int, db: Session = Depends(get_db)):
    favorite = db.get(models.FavoriteVideo, favorite_id)
    if not favorite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="收藏记录不存在")

    db.delete(favorite)
    db.commit()
    return None
