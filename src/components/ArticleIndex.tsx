import { useEffect, useMemo, useRef, useState } from 'react';
import type { Post } from '../lib/content';
import ReactIcon from './ReactIcon';

export default function ArticleIndex({ posts }: { posts: Post[] }) {
  const categories = useMemo(() => ['全部', ...new Set(posts.map((post) => post.type))], [posts]);
  const tags = useMemo(() => ['全部', ...new Set(posts.flatMap((post) => post.tags))], [posts]);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const [page, setPage] = useState(1);
  const hydrated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get('q') || '';
    const catParam = params.get('category') || '全部';
    const tagParam = params.get('tag') || '全部';
    const pageParam = Math.max(1, Number(params.get('page')) || 1);

    setQuery(qParam);
    if (categories.includes(catParam)) setCategory(catParam);
    if (tags.includes(tagParam)) setTag(tagParam);
    setPage(pageParam);
    hydrated.current = true;
  }, [categories, tags]);

  useEffect(() => {
    if (!hydrated.current) return;
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    if (category !== '全部') url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    if (tag !== '全部') url.searchParams.set('tag', tag);
    else url.searchParams.delete('tag');
    if (page > 1) url.searchParams.set('page', String(page));
    else url.searchParams.delete('page');
    history.replaceState(null, '', url);
  }, [query, category, tag, page]);

  const filtered = useMemo(
    () =>
      posts.filter(
        (post) =>
          (category === '全部' || post.type === category) &&
          (tag === '全部' || post.tags.includes(tag)) &&
          `${post.title} ${post.summary} ${post.tags.join(' ')}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [posts, query, category, tag],
  );

  const pages = Math.ceil(filtered.length / 8);
  const hasActiveFilter = Boolean(query.trim()) || category !== '全部' || tag !== '全部';

  function toggleTag(value: string) {
    // Press once to filter, press the same tag again to release back to All
    setTag((prev) => (prev === value && value !== '全部' ? '全部' : value));
    setPage(1);
  }

  function clear() {
    setQuery('');
    setCategory('全部');
    setTag('全部');
    setPage(1);
  }

  return (
    <>
      <div className="article-tools">
        <div className="search-field">
          <div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="10" cy="10" r="7" />
              <path d="m15 15 5 5" />
            </svg>
            <input
              id="article-search"
              type="search"
              aria-label="搜索文章"
              placeholder="搜索标题、主题或关键词（按 / 聚焦）"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.stopPropagation();
                  setQuery('');
                  setPage(1);
                }
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="清空搜索关键词"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="category-field">
          <select
            id="article-category"
            aria-label="按分类筛选"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            {categories.map((value) => (
              <option key={value} value={value}>
                {value === '全部' ? '全部分类' : value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="topic-filter" role="group" aria-label="按主题筛选">
        {tags.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tag === value}
            onClick={() => toggleTag(value)}
          >
            {value === '全部' ? '所有主题' : value}
          </button>
        ))}
      </div>

      <div className="filter-status-bar">
        <p className="result-count" role="status">
          {filtered.length} 篇笔记
          {category !== '全部' && ` · ${category}`}
          {tag !== '全部' && ` · #${tag}`}
          {query.trim() && ` · 「${query.trim()}」`}
        </p>
        {hasActiveFilter && (
          <button type="button" className="reset-filter-btn" onClick={clear}>
            重置筛选
          </button>
        )}
      </div>

      <div className="writing-list">
        {filtered.slice((page - 1) * 8, page * 8).map((post) => (
          <article className="writing-row" key={post.id}>
            <div className="writing-date">
              <time dateTime={post.date}>{post.displayDate}</time>
              <span>
                {post.type} · {post.minutes} 分钟
              </span>
            </div>
            <div className="writing-body">
              <h2>
                <a href={post.href}>{post.title}</a>
              </h2>
              <p>{post.summary}</p>
              <div className="writing-tags">
                {post.tags.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={tag === item}
                    onClick={() => toggleTag(item)}
                  >
                    #{item}
                  </button>
                ))}
              </div>
            </div>
            <a className="row-arrow" href={post.href} aria-label={`阅读：${post.title}`}>
              <ReactIcon name="diagonal" size={24} />
            </a>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <h2>这条思路，还没写下来。</h2>
            <p>试试另一个关键词，或清除筛选看看全部笔记。</p>
            <button type="button" className="button" onClick={clear}>
              清除筛选
            </button>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav className="pagination" aria-label="文章分页">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span>
            {page} / {pages}
          </span>
          <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>
            下一页
          </button>
        </nav>
      )}
    </>
  );
}
