import { fetchJson } from "./client";

export interface SearchParams {
  keyword: string;
  language?: string;
  duration?: "short" | "medium" | "long";
  maxResults?: number;
  theme?: "youtube" | "kids";
  pageToken?: string;
}

export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  durationISO8601?: string;
}

export interface SearchMeta {
  originalKeyword: string;
  translatedKeyword: string;
  detectedKeywordLanguage: string | null;
  targetLanguage: string | null;
  theme: "youtube" | "kids";
  searchKeywordUsed: string;
  nextPageToken?: string | null;
  prevPageToken?: string | null;
  pageInfo?: {
    totalResults?: number;
    resultsPerPage?: number;
  };
}

export interface SearchResponse {
  count: number;
  items: VideoItem[];
  meta: SearchMeta;
}

export async function searchVideos(params: SearchParams) {
  const query = new URLSearchParams({
    keyword: params.keyword,
    ...(params.language ? { language: params.language } : {}),
    ...(params.duration ? { duration: params.duration } : {}),
    max_results: String(params.maxResults ?? 12),
    theme: params.theme ?? "youtube",
    ...(params.pageToken ? { pageToken: params.pageToken } : {}),
  });
  return fetchJson<SearchResponse>(`/api/youtube/search?${query}`);
}
