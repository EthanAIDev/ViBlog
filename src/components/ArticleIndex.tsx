import { useMemo, useState } from 'react';
import type { Post } from '../lib/content';
import ReactIcon from './ReactIcon';

export default function ArticleIndex({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const [page, setPage] = useState(1);
  const categories = ['全部', ...new Set(posts.map((post) => post.type))];
  const tags = ['全部', ...new Set(posts.flatMap((post) => post.tags))];
  const filtered = useMemo(() => posts.filter((post) =>
    (category === '全部' || post.type === category) && (tag === '全部' || post.tags.includes(tag)) &&
    `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ), [posts, query, category, tag]);
  const pages = Math.ceil(filtered.length / 8);
  function clear() { setQuery(''); setCategory('全部'); setTag('全部'); setPage(1); }
  return <>
    <div className="article-tools">
      <div className="search-field"><label htmlFor="article-search">搜索文章</label><div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 5 5"/></svg><input id="article-search" type="search" placeholder="标题、主题或一个关键词" value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/></div></div>
      <div className="category-field"><label htmlFor="article-category">分类</label><select id="article-category" value={category} onChange={(event) => {setCategory(event.target.value);setPage(1);}}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
    </div>
    <div className="topic-filter" role="group" aria-label="按主题筛选">{tags.map((value) => <button key={value} type="button" aria-pressed={tag === value} onClick={() => {setTag(value);setPage(1);}}>{value === '全部' ? '所有主题' : value}</button>)}</div>
    <p className="result-count" role="status">{filtered.length} 篇笔记{query && ` · 搜索「${query}」`}</p>
    <div className="writing-list">
      {filtered.slice((page-1)*8,page*8).map((post) => <article className="writing-row" key={post.id}>
        <div className="writing-date"><time dateTime={post.date}>{post.displayDate}</time><span>{post.type} · {post.minutes} 分钟</span></div>
        <div className="writing-body"><h2><a href={post.href}>{post.title}</a></h2><p>{post.summary}</p><div className="writing-tags">{post.tags.map((item) => <span key={item}>{item}</span>)}</div></div>
        <a className="row-arrow" href={post.href} aria-label={`阅读：${post.title}`}><ReactIcon name="diagonal" size={25}/></a>
      </article>)}
      {filtered.length === 0 && <div className="empty-state"><h2>这条思路，还没写下来。</h2><p>试试另一个关键词，或清除筛选看看全部笔记。</p><button className="button button-dark" onClick={clear}>清除筛选</button></div>}
    </div>
    {pages > 1 && <nav className="pagination" aria-label="文章分页"><button disabled={page === 1} onClick={() => setPage(page-1)}>上一页</button><span>{page} / {pages}</span><button disabled={page === pages} onClick={() => setPage(page+1)}>下一页</button></nav>}
  </>;
}
