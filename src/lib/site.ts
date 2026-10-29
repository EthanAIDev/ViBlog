export {};

const copyButtons = document.querySelectorAll<HTMLButtonElement>('[data-copy]');
copyButtons.forEach((button) => button.addEventListener('click', async () => {
  const value = button.dataset.copy || '';
  try {
    await navigator.clipboard.writeText(value);
    button.textContent = '已复制 QQ 号';
  } catch {
    button.textContent = `QQ：${value}`;
  }
}));

document.querySelectorAll<HTMLElement>('.prose pre').forEach((pre) => {
  if (pre.querySelector('.language-mermaid')) return;
  const code = pre.querySelector('code');
  if (!code) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  button.textContent = '复制';
  button.setAttribute('aria-label', '复制这段代码');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      button.textContent = '已复制';
      setTimeout(() => { button.textContent = '复制'; }, 1800);
    } catch { button.textContent = '请选中代码复制'; }
  });
  pre.append(button);
});

async function renderDiagrams() {
  const diagrams = document.querySelectorAll<HTMLElement>('.prose code.language-mermaid');
  if (!diagrams.length) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: { primaryColor: '#eae8e1', primaryTextColor: '#272923', primaryBorderColor: '#888b80', lineColor: '#5e6257', secondaryColor: '#f4d0b9', tertiaryColor: '#f3f1e9', fontFamily: 'sans-serif' } });
  for (let index = 0; index < diagrams.length; index++) {
    const code = diagrams[index];
    const container = document.createElement('div');
    container.className = 'mermaid-diagram';
    container.setAttribute('aria-label', '流程图');
    try {
      const { svg } = await mermaid.render(`diagram-${index}`, code.textContent || '');
      container.innerHTML = svg;
      code.closest('pre')?.replaceWith(container);
    } catch { /* Keep the original readable diagram source when syntax is unsupported. */ }
  }
}
void renderDiagrams().catch(() => { /* The original diagram source remains readable offline. */ });

document.querySelectorAll<HTMLImageElement>('.prose img').forEach((image) => {
  if (image.closest('button, a')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'article-image-button';
  button.dataset.galleryImage = image.dataset.original || image.src;
  button.dataset.caption = image.alt || '文章配图';
  button.setAttribute('aria-label', `放大查看：${image.alt || '文章配图'}`);
  image.replaceWith(button);
  button.append(image);
});

const lightbox = document.querySelector<HTMLDialogElement>('#gallery-dialog');
if (lightbox) {
  let image: HTMLImageElement | null = null;
  const caption = lightbox.querySelector<HTMLElement>('figcaption')!;
  let trigger: HTMLElement | null = null;
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-image]').forEach((button) => button.addEventListener('click', () => {
    trigger = button;
    if (!image) { image = document.createElement('img'); lightbox.querySelector('.dialog-image')!.append(image); }
    image.src = button.dataset.galleryImage || '';
    image.alt = button.dataset.caption || '项目截图';
    caption.textContent = image.alt;
    lightbox.showModal();
  }));
  const close = () => lightbox.close();
  lightbox.querySelector('button')?.addEventListener('click', close);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  lightbox.addEventListener('close', () => { trigger?.focus(); });
}
