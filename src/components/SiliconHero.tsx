import { useEffect, useRef } from 'react';
import ReactIcon from './ReactIcon';
import type { AsciiHeroHandle } from '../lib/ascii-hero';

const CAPABILITIES = ['AI Agent 编排', 'RAG 检索', 'Text-to-SQL', '可观测工程'];

export default function SiliconHero() {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<AsciiHeroHandle | null>(null);

  useEffect(() => {
    const host = stageRef.current;
    const hero = heroRef.current;
    if (!host || !hero) return;
    let cancelled = false;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = hero.getBoundingClientRect();
        const scroll = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
        handleRef.current?.setScroll(scroll);
        if (copyRef.current) {
          copyRef.current.style.setProperty('--hero-scroll', scroll.toFixed(4));
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    import('../lib/ascii-hero')
      .then(({ createAsciiHero }) => {
        if (cancelled || !stageRef.current) return;
        const handle = createAsciiHero(stageRef.current);
        handleRef.current = handle;
        onScroll();
      })
      .catch(() => {
        // Software-only fallback keeps crisp typography and global ambient grid
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  return (
    <section ref={heroRef} className="silicon-hero" aria-label="Ethan AI Agent 精密工程主屏">
      <div
        ref={stageRef}
        className="silicon-stage"
        aria-label="可拖拽旋转、柔光透视精雕芯片主板并连续注入并发信号流的实时 ASCII 场景"
      />

      <div className="silicon-overlay page-shell">
        <div ref={copyRef} className="hero-copy">
          <h1>
            把想法，
            <br />
            变成会工作的系统。
          </h1>

          <p className="hero-subtitle">
            专注 AI Agent 编排、RAG 检索与 Text-to-SQL——让每一次推理都透明、可控、可验证。
          </p>

          <ul className="hero-capabilities" aria-label="核心工程领域">
            {CAPABILITIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="hero-actions">
            <a className="btn-primary" href="#selected-work">
              查看核心项目 <ReactIcon name="arrow" size={16} />
            </a>
            <a className="btn-ghost" href="/about/">
              关于与联系 <ReactIcon name="diagonal" size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
