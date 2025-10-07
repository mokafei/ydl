from fastapi import APIRouter, HTTPException, Query
import httpx
from deep_translator import GoogleTranslator
from langdetect import LangDetectException, detect

from ..config import settings

router = APIRouter()

LANGUAGE_ALIAS: dict[str, str] = {
    "zh": "zh-cn",
    "zh-cn": "zh-cn",
    "zh-hans": "zh-cn",
    "zh-tw": "zh-tw",
    "en": "en",
    "ja": "ja",
    "ko": "ko",
}

THEME_YOUTUBE = "youtube"
THEME_KIDS = "kids"
ALLOWED_THEMES = {THEME_YOUTUBE, THEME_KIDS}


def _normalize_lang_code(lang: str | None) -> str | None:
    if not lang:
        return None
    lang_lower = lang.lower()
    return LANGUAGE_ALIAS.get(lang_lower, lang_lower)


def translate_keyword_if_needed(keyword: str, target_lang: str | None) -> tuple[str, str | None]:
    if not target_lang:
        return keyword, None

    normalized_target = _normalize_lang_code(target_lang)
    if not normalized_target:
        return keyword, None

    try:
        detected_lang = detect(keyword)
    except LangDetectException:
        detected_lang = None

    if detected_lang and _normalize_lang_code(detected_lang) == normalized_target:
        return keyword, detected_lang

    try:
        translator = GoogleTranslator(source="auto", target=normalized_target)
        translated_text = translator.translate(keyword)
        if translated_text and isinstance(translated_text, str):
            return translated_text, detected_lang
    except Exception:
        # 如果翻译失败，保持原始关键词
        pass

    return keyword, detected_lang


@router.get("/search")
async def search_videos(
    keyword: str = Query(..., min_length=1),
    language: str | None = Query(None, description="语言代码，例如 en、zh"),
    duration: str | None = Query(None, description="持续时间：short/medium/long"),
    max_results: int = Query(12, ge=1, le=50),
    theme: str = Query(THEME_YOUTUBE, description="主题：youtube 或 kids"),
    page_token: str | None = Query(None, alias="pageToken", description="翻页令牌"),
):
    if theme not in ALLOWED_THEMES:
        raise HTTPException(status_code=400, detail="不支持的主题类型")

    normalized_language = _normalize_lang_code(language)
    translated_keyword, detected_lang = translate_keyword_if_needed(keyword, normalized_language)

    params = {
        "part": "snippet",
        "type": "video",
        "maxResults": max_results,
        "key": settings.youtube_api_key,
    }
    if normalized_language:
        params["relevanceLanguage"] = normalized_language
    if duration:
        params["videoDuration"] = duration

    search_keyword = translated_keyword
    if theme == THEME_KIDS:
        params["safeSearch"] = "strict"
        params["videoEmbeddable"] = "true"
        if "videoDuration" not in params:
            params["videoDuration"] = "medium"
        # 增强儿童友好关键词
        search_keyword = f"{translated_keyword} kids"

    params["q"] = search_keyword
    if page_token:
        params["pageToken"] = page_token

    async with httpx.AsyncClient(base_url=settings.youtube_api_base, timeout=10.0) as client:
        resp = await client.get("search", params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())

    payload = resp.json()
    items = payload.get("items", [])
    next_page_token = payload.get("nextPageToken")
    prev_page_token = payload.get("prevPageToken")
    page_info = payload.get("pageInfo", {})
    video_ids = ",".join(item["id"]["videoId"] for item in items if item.get("id"))
    durations: dict[str, str] = {}

    if video_ids:
        async with httpx.AsyncClient(base_url=settings.youtube_api_base, timeout=10.0) as client:
            detail_resp = await client.get(
                "videos",
                params={
                    "part": "contentDetails",
                    "id": video_ids,
                    "key": settings.youtube_api_key,
                },
            )
        if detail_resp.status_code == 200:
            for item in detail_resp.json().get("items", []):
                durations[item["id"]] = item["contentDetails"]["duration"]

    results = []
    for item in items:
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        results.append(
            {
                "videoId": video_id,
                "title": snippet["title"],
                "description": snippet["description"],
                "thumbnail": snippet["thumbnails"]["high"]["url"],
                "channelTitle": snippet["channelTitle"],
                "publishedAt": snippet["publishedAt"],
                "durationISO8601": durations.get(video_id),
            }
        )
    return {
        "count": len(results),
        "items": results,
        "meta": {
            "originalKeyword": keyword,
            "translatedKeyword": translated_keyword,
            "detectedKeywordLanguage": detected_lang,
            "targetLanguage": normalized_language,
            "theme": theme,
            "searchKeywordUsed": search_keyword,
            "nextPageToken": next_page_token,
            "prevPageToken": prev_page_token,
            "pageInfo": page_info,
        },
    }
