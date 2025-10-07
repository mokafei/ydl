import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchVideos, VideoItem, SearchMeta, SearchParams } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import "./Home.css";

type UILanguage = "zh" | "en" | "ja" | "ko";
type ColorMode = "light" | "dark";
type ThemeType = "youtube" | "kids";
type DurationOption = "" | "short" | "medium" | "long";
type LearningLanguageKey = "all" | "english" | "chinese" | "japanese" | "korean";
type DurationKey = "all" | "short" | "medium" | "long";
type ResultsLayout = "list" | "grid";

interface Translation {
  title: string;
  subtitle: string;
  toolbarLanguageLabel: string;
  toolbarThemeLabel: string;
  uiThemeModes: {
    light: string;
    dark: string;
  };
  themeLabel: string;
  themeOptions: {
    adult: string;
    kids: string;
  };
  keywordLabel: string;
  keywordPlaceholder: string;
  studyLanguageLabel: string;
  learningLanguages: Record<LearningLanguageKey, string>;
  durationLabel: string;
  durationOptions: Record<DurationKey, string>;
  searchButton: string;
  searching: string;
  errorNoKeyword: string;
  searchFailed: string;
  noticeAdult: string;
  noticeKids: string;
  noResults: string;
  loadingMore: string;
  layoutToggleLabel: string;
  layoutToggleList: string;
  layoutToggleGrid: string;
  formatSearchKeyword: (keyword: string) => string;
  formatTranslatedKeyword: (translated: string, original: string) => string;
  formatTargetLanguage: (lang: string) => string;
  videoCardLabels: {
    watchOnYoutube: string;
    openInline: string;
    closeInline: string;
    addToCollection: string;
  };
}

const translations: Record<UILanguage, Translation> = {
  zh: {
    title: "沉浸式语言平台",
    subtitle: "输入关键词，选择语言和时长，获取适合的学习视频。",
    toolbarLanguageLabel: "界面语言",
    toolbarThemeLabel: "主题模式",
    uiThemeModes: { light: "白天", dark: "夜间" },
    themeLabel: "风格主题",
    themeOptions: { adult: "适合成年人", kids: "适合儿童" },
    keywordLabel: "关键词",
    keywordPlaceholder: "例如：English listening",
    studyLanguageLabel: "学习语言",
    learningLanguages: {
      all: "全部语言",
      english: "英语",
      chinese: "中文",
      japanese: "日语",
      korean: "韩语",
    },
    durationLabel: "视频时长",
    durationOptions: {
      all: "全部时长",
      short: "短视频 (<4 分钟)",
      medium: "中等 (4-20 分钟)",
      long: "长视频 (>20 分钟)",
    },
    searchButton: "开始搜索",
    searching: "搜索中...",
    errorNoKeyword: "请先输入关键词",
    searchFailed: "搜索失败，请稍后再试",
    noticeAdult: "标准模式：基于原始关键词返回普通搜索结果。",
    noticeKids: "儿童模式：系统会自动过滤成人内容并添加儿童相关关键词，但仍建议家长陪同。",
    noResults: "目前还没有结果，试试输入关键词搜索。",
    loadingMore: "正在加载更多...",
    layoutToggleLabel: "结果展示",
    layoutToggleList: "详细模式",
    layoutToggleGrid: "简洁模式",
    formatSearchKeyword: (keyword) => `本次检索词：${keyword}`,
    formatTranslatedKeyword: (translated, original) => `翻译后关键词：${translated}（原词：${original}）`,
    formatTargetLanguage: (lang) => `目标语言：${lang}`,
    videoCardLabels: {
      watchOnYoutube: "在 YT 播放",
      openInline: "播放",
      closeInline: "关闭播放",
      addToCollection: "添加到收藏",
    },
  },
  en: {
    title: "Immersive Language Hub",
    subtitle: "Enter a keyword, pick a study language and duration to discover tailored videos.",
    toolbarLanguageLabel: "Interface language",
    toolbarThemeLabel: "Display mode",
    uiThemeModes: { light: "Day", dark: "Night" },
    themeLabel: "Style theme",
    themeOptions: { adult: "Suited for adults", kids: "Suited for kids" },
    keywordLabel: "Keyword",
    keywordPlaceholder: "e.g. English listening",
    studyLanguageLabel: "Study language",
    learningLanguages: {
      all: "All languages",
      english: "English",
      chinese: "Chinese",
      japanese: "Japanese",
      korean: "Korean",
    },
    durationLabel: "Video length",
    durationOptions: {
      all: "Any length",
      short: "Short (<4 min)",
      medium: "Medium (4-20 min)",
      long: "Long (>20 min)",
    },
    searchButton: "Search",
    searching: "Searching...",
    errorNoKeyword: "Please enter a keyword first",
    searchFailed: "Search failed, please try again later",
    noticeAdult: "Adult mode: shows general search results based on your keyword.",
    noticeKids: "Kids mode: filters adult content and adds child-friendly keywords. Supervision is still recommended.",
    noResults: "No results yet. Try searching with a keyword.",
    loadingMore: "Loading more...",
    layoutToggleLabel: "Results view",
    layoutToggleList: "Detailed",
    layoutToggleGrid: "Thumbnail grid",
    formatSearchKeyword: (keyword) => `Keyword used: ${keyword}`,
    formatTranslatedKeyword: (translated, original) => `Translated keyword: ${translated} (original: ${original})`,
    formatTargetLanguage: (lang) => `Target language: ${lang}`,
    videoCardLabels: {
      watchOnYoutube: "Play on YT",
      openInline: "Play",
      closeInline: "Stop playback",
      addToCollection: "Add to favorites",
    },
  },
  ja: {
    title: "イマーシブ言語プラットフォーム",
    subtitle: "キーワードと言語・再生時間を選んで、学習に合った動画を探しましょう。",
    toolbarLanguageLabel: "表示言語",
    toolbarThemeLabel: "表示モード",
    uiThemeModes: { light: "昼", dark: "夜" },
    themeLabel: "スタイルテーマ",
    themeOptions: { adult: "大人向け", kids: "子ども向け" },
    keywordLabel: "キーワード",
    keywordPlaceholder: "例：English listening",
    studyLanguageLabel: "学習言語",
    learningLanguages: {
      all: "すべての言語",
      english: "英語",
      chinese: "中国語",
      japanese: "日本語",
      korean: "韓国語",
    },
    durationLabel: "動画の長さ",
    durationOptions: {
      all: "長さを指定しない",
      short: "短編 (<4分)",
      medium: "中編 (4〜20分)",
      long: "長編 (>20分)",
    },
    searchButton: "検索する",
    searching: "検索中...",
    errorNoKeyword: "キーワードを入力してください",
    searchFailed: "検索に失敗しました。しばらくしてからお試しください",
    noticeAdult: "大人向けモード：入力したキーワードを基に通常の結果を表示します。",
    noticeKids: "子ども向けモード：児童向けキーワードを追加し、不適切な内容をフィルタリングします。保護者の同伴をおすすめします。",
    noResults: "まだ結果がありません。キーワードを入力して検索してください。",
    loadingMore: "さらに読み込み中...",
    layoutToggleLabel: "表示切替",
    layoutToggleList: "詳細",
    layoutToggleGrid: "サムネイル",
    formatSearchKeyword: (keyword) => `使用した検索語：${keyword}`,
    formatTranslatedKeyword: (translated, original) => `翻訳後の検索語：${translated}（元の語：${original}）`,
    formatTargetLanguage: (lang) => `ターゲット言語：${lang}`,
    videoCardLabels: {
      watchOnYoutube: "YT で再生",
      openInline: "再生",
      closeInline: "再生を停止",
      addToCollection: "お気に入りに追加",
    },
  },
  ko: {
    title: "몰입형 언어 플랫폼",
    subtitle: "키워드와 학습 언어, 영상 길이를 선택해 맞춤 영상을 찾아보세요.",
    toolbarLanguageLabel: "인터페이스 언어",
    toolbarThemeLabel: "표시 모드",
    uiThemeModes: { light: "주간", dark: "야간" },
    themeLabel: "스타일 테마",
    themeOptions: { adult: "성인용", kids: "어린이용" },
    keywordLabel: "키워드",
    keywordPlaceholder: "예: English listening",
    studyLanguageLabel: "학습 언어",
    learningLanguages: {
      all: "모든 언어",
      english: "영어",
      chinese: "중국어",
      japanese: "일본어",
      korean: "한국어",
    },
    durationLabel: "영상 길이",
    durationOptions: {
      all: "전체 길이",
      short: "짧은 영상 (<4분)",
      medium: "중간 (4~20분)",
      long: "긴 영상 (>20분)",
    },
    searchButton: "검색하기",
    searching: "검색 중...",
    errorNoKeyword: "먼저 키워드를 입력하세요",
    searchFailed: "검색에 실패했습니다. 잠시 후 다시 시도해 주세요",
    noticeAdult: "성인 모드: 입력한 키워드를 기반으로 일반 검색 결과를 제공합니다.",
    noticeKids: "어린이 모드: 부적절한 콘텐츠를 필터링하고 어린이 친화적인 키워드를 추가합니다. 보호자의 동반을 권장합니다.",
    noResults: "아직 결과가 없습니다. 키워드를 입력해 검색해 보세요.",
    loadingMore: "추가 로딩 중...",
    layoutToggleLabel: "보기 전환",
    layoutToggleList: "상세",
    layoutToggleGrid: "썸네일",
    formatSearchKeyword: (keyword) => `검색어: ${keyword}`,
    formatTranslatedKeyword: (translated, original) => `번역된 검색어: ${translated} (원본: ${original})`,
    formatTargetLanguage: (lang) => `목표 언어: ${lang}`,
    videoCardLabels: {
      watchOnYoutube: "YT에서 재생",
      openInline: "재생",
      closeInline: "재생 중지",
      addToCollection: "즐겨찾기에 추가",
    },
  },
};

const uiLanguageOptions = [
  { value: "zh" as UILanguage, label: "中文" },
  { value: "en" as UILanguage, label: "English" },
  { value: "ja" as UILanguage, label: "日本語" },
  { value: "ko" as UILanguage, label: "한국어" },
];

const learningLanguageBase: { value: string; key: LearningLanguageKey }[] = [
  { value: "", key: "all" },
  { value: "en", key: "english" },
  { value: "zh", key: "chinese" },
  { value: "ja", key: "japanese" },
  { value: "ko", key: "korean" },
];

const durationBase: { value: DurationOption; key: DurationKey }[] = [
  { value: "", key: "all" },
  { value: "short", key: "short" },
  { value: "medium", key: "medium" },
  { value: "long", key: "long" },
];

interface HomeProps {
  theme: ThemeType;
  colorMode: ColorMode;
  onThemeChange?: (theme: ThemeType) => void;
  onColorModeChange?: (mode: ColorMode) => void;
  onOpenActivation?: () => void;
}

const Home: React.FC<HomeProps> = ({ theme, colorMode, onThemeChange, onColorModeChange, onOpenActivation }) => {
  const [uiLanguage, setUiLanguage] = useState<UILanguage>("zh");
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("");
  const [duration, setDuration] = useState<DurationOption>("");
  const [layout, setLayout] = useState<ResultsLayout>("list");
  const [results, setResults] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [currentRequest, setCurrentRequest] = useState<SearchParams | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAppending, setIsAppending] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const t = useMemo(() => translations[uiLanguage], [uiLanguage]);

  const learningOptions = useMemo(
    () => learningLanguageBase.map(({ value, key }) => ({ value, label: t.learningLanguages[key] })),
    [t],
  );

  const durationOptions = useMemo(
    () => durationBase.map(({ value, key }) => ({ value, label: t.durationOptions[key] })),
    [t],
  );

  const themeOptions = useMemo(
    () => [
      { value: "youtube" as ThemeType, label: t.themeOptions.adult },
      { value: "kids" as ThemeType, label: t.themeOptions.kids },
    ],
    [t],
  );

  const noticeText = theme === "kids" ? t.noticeKids : t.noticeAdult;
  const homeClassName = useMemo(() => `home home--${theme} home--${colorMode}`, [theme, colorMode]);

  const performSearch = useCallback(
    async (request: SearchParams, pageNumber: number, append = false) => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      if (append) {
        setIsAppending(true);
      }

      try {
        const data = await searchVideos(request);
        setResults((prev) => (append ? [...prev, ...data.items] : data.items));
        setMeta(data.meta);
        setCurrentRequest(request);
        setCurrentPage(pageNumber);
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : t.searchFailed;
        setError(message);
      } finally {
        setLoading(false);
        setIsAppending(false);
        isFetchingRef.current = false;
      }
    },
    [t.searchFailed],
  );

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!keyword.trim()) {
      setError(t.errorNoKeyword);
      return;
    }

    const request: SearchParams = {
      keyword: keyword.trim(),
      language: language || undefined,
      duration: duration === "" ? undefined : duration,
      maxResults: 12,
      theme,
      pageToken: undefined,
    };
    setMeta(null);
    setError(null);
    setResults([]);
    await performSearch(request, 1);
  };

  const loadNextPage = useCallback(async () => {
    if (!currentRequest || isFetchingRef.current || !meta?.nextPageToken) {
      return;
    }
    const nextRequest: SearchParams = { ...currentRequest, pageToken: meta.nextPageToken };
    await performSearch(nextRequest, currentPage + 1, true);
  }, [currentRequest, meta, performSearch, currentPage]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadNextPage();
        }
      });
    });

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadNextPage, meta?.nextPageToken]);

  const isLoadingMore = isAppending && currentPage > 1;

  return (
    <div className={homeClassName}>
      <div className="home__surface">
        <header className="home__header">
          <div className="home__toolbar">
            <div className="home__toolbar-group">
              <label htmlFor="ui-language">{t.toolbarLanguageLabel}</label>
              <select
                id="ui-language"
                value={uiLanguage}
                onChange={(e) => setUiLanguage(e.target.value as UILanguage)}
              >
                {uiLanguageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="home__toolbar-group">
              <label htmlFor="color-mode">{t.toolbarThemeLabel}</label>
              <select
                id="color-mode"
                value={colorMode}
                onChange={(e) => onColorModeChange?.(e.target.value as ColorMode)}
              >
                <option value="light">{t.uiThemeModes.light}</option>
                <option value="dark">{t.uiThemeModes.dark}</option>
              </select>
            </div>
            {onOpenActivation && (
              <button type="button" className="home__license-button" onClick={onOpenActivation}>
                账号授权中心
              </button>
            )}
          </div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>

        <form className="home__form" onSubmit={handleSearch}>
          <div className="form-row">
            <label htmlFor="theme">{t.themeLabel}</label>
            <select id="theme" value={theme} onChange={(e) => onThemeChange?.(e.target.value as ThemeType)}>
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="keyword">{t.keywordLabel}</label>
            <input
              id="keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t.keywordPlaceholder}
            />
          </div>

          <div className="form-row">
            <label htmlFor="language">{t.studyLanguageLabel}</label>
            <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {learningOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="duration">{t.durationLabel}</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value as DurationOption)}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="home__submit" disabled={loading}>
            {loading ? t.searching : t.searchButton}
          </button>
        </form>

        <div className={`home__notice ${theme === "kids" ? "home__notice--kids" : ""}`}>{noticeText}</div>

        {error ? <div className="home__error">{error}</div> : null}
        {meta ? (
          <div className="home__meta">
            <span>{t.formatSearchKeyword(meta.searchKeywordUsed)}</span>
            {meta.translatedKeyword !== meta.originalKeyword ? (
              <span>{t.formatTranslatedKeyword(meta.translatedKeyword, meta.originalKeyword)}</span>
            ) : null}
            {meta.targetLanguage ? <span>{t.formatTargetLanguage(meta.targetLanguage)}</span> : null}
          </div>
        ) : null}

        <div className="home__results-toolbar">
          <span>{t.layoutToggleLabel}</span>
          <div className="home__results-toggle" role="group" aria-label={t.layoutToggleLabel}>
            <button
              type="button"
              className={`home__results-toggle-btn ${layout === "list" ? "home__results-toggle-btn--active" : ""}`}
              onClick={() => setLayout("list")}
            >
              {t.layoutToggleList}
            </button>
            <button
              type="button"
              className={`home__results-toggle-btn ${layout === "grid" ? "home__results-toggle-btn--active" : ""}`}
              onClick={() => setLayout("grid")}
            >
              {t.layoutToggleGrid}
            </button>
          </div>
        </div>

        <section className={`home__results home__results--${layout}`}>
          {results.length === 0 && !loading ? <p>{t.noResults}</p> : null}
          {results.map((video, index) => (
            <VideoCard
              key={`${video.videoId}-${index}`}
              video={video}
              labels={t.videoCardLabels}
              layout={layout}
              index={index + 1}
            />
          ))}
          <div ref={sentinelRef} className="home__sentinel" aria-hidden />
          {isLoadingMore ? (
            <div className="home__loading-more">
              <div className="home__loading-more-spinner" />
              <p>{t.loadingMore}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default Home;
