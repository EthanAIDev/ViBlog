export {};

let pageScope:AbortController|undefined;
let diagramSequence=0;
let initializedDocument:HTMLElement|undefined;

function initializePage(){
  if(initializedDocument===document.body)return;
  initializedDocument=document.body;
  pageScope?.abort();
  const scope=new AbortController(),{signal}=scope;pageScope=scope;
  const page=document.body.className;
  document.querySelectorAll<HTMLAnchorElement>('.primary-nav a').forEach(link=>{
    const active=link.pathname==='/posts/'?/page-(posts|article)\b/.test(page):link.pathname==='/projects/'?/page-(projects|project)\b/.test(page):page.includes('page-about');
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  let scrollFrame=0;
  const updateHeader=()=>{scrollFrame=0;const next=String(scrollY>24);if(document.documentElement.dataset.scrolled!==next)document.documentElement.dataset.scrolled=next;};
  window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateHeader);},{passive:true,signal});
  signal.addEventListener('abort',()=>cancelAnimationFrame(scrollFrame),{once:true});updateHeader();

  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const value=button.dataset.copy||'';
    try{await navigator.clipboard.writeText(value);button.textContent='已复制 QQ 号';}catch{button.textContent=`QQ：${value}`;}
  },{signal}));

  document.querySelectorAll<HTMLElement>('.prose pre').forEach(pre=>{
    if(pre.querySelector('.language-mermaid'))return;
    const code=pre.querySelector('code');if(!code)return;
    const button=pre.querySelector<HTMLButtonElement>('.copy-code')||document.createElement('button');
    button.type='button';button.className='copy-code';button.textContent='复制';button.setAttribute('aria-label','复制这段代码');
    button.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(code.textContent||'');button.textContent='已复制';setTimeout(()=>{if(!signal.aborted)button.textContent='复制';},1800);}
      catch{button.textContent='请选中代码复制';}
    },{signal});
    if(!button.isConnected)pre.append(button);
  });

  document.querySelectorAll<HTMLImageElement>('.prose img').forEach(image=>{
    if(image.closest('button,a'))return;
    const button=document.createElement('button');button.type='button';button.className='article-image-button';
    button.dataset.galleryImage=image.dataset.original||image.src;button.dataset.caption=image.alt||'文章配图';button.setAttribute('aria-label',`放大查看：${image.alt||'文章配图'}`);
    image.replaceWith(button);button.append(image);
  });

  const lightbox=document.querySelector<HTMLDialogElement>('#gallery-dialog');
  if(lightbox){
    let image=lightbox.querySelector<HTMLImageElement>('.dialog-image img');
    const caption=lightbox.querySelector<HTMLElement>('figcaption')!;let trigger:HTMLElement|null=null;
    document.querySelectorAll<HTMLButtonElement>('[data-gallery-image]').forEach(button=>button.addEventListener('click',()=>{
      trigger=button;
      if(!image){image=document.createElement('img');lightbox.querySelector('.dialog-image')!.append(image);}
      image.src=button.dataset.galleryImage||'';image.alt=button.dataset.caption||'项目截图';caption.textContent=image.alt;
      if(!lightbox.open)lightbox.showModal();
    },{signal}));
    lightbox.querySelector('button')?.addEventListener('click',()=>lightbox.close(),{signal});
    lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close();},{signal});
    lightbox.addEventListener('close',()=>trigger?.focus(),{signal});
  }
  void renderDiagrams(signal).catch(()=>{ /* Keep readable source if diagram loading fails. */ });
}

async function renderDiagrams(signal:AbortSignal){
  const diagrams=[...document.querySelectorAll<HTMLElement>('.prose code.language-mermaid:not([data-rendering])')];
  if(!diagrams.length)return;
  diagrams.forEach(code=>{code.dataset.rendering='true';});
  const {default:mermaid}=await import('mermaid');
  if(signal.aborted){diagrams.forEach(code=>delete code.dataset.rendering);return;}
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:{primaryColor:'#eae8e1',primaryTextColor:'#272923',primaryBorderColor:'#888b80',lineColor:'#5e6257',secondaryColor:'#f4d0b9',tertiaryColor:'#f3f1e9',fontFamily:'sans-serif'}});
  for(const code of diagrams){
    if(signal.aborted||!code.isConnected){delete code.dataset.rendering;continue;}
    try{
      const {svg}=await mermaid.render(`diagram-${diagramSequence++}`,code.textContent||'');
      if(signal.aborted||!code.isConnected){delete code.dataset.rendering;continue;}
      const container=document.createElement('div');container.className='mermaid-diagram';container.setAttribute('aria-label','流程图');container.innerHTML=svg;code.closest('pre')?.replaceWith(container);
    }catch{delete code.dataset.rendering;}
  }
}

document.addEventListener('astro:before-swap',event=>{
  pageScope?.abort();
  // Rapid navigation or a viewport change may cancel only the visual snapshot.
  // The document swap still succeeds; consume that expected animation rejection.
  void event.viewTransition.ready.catch((error:DOMException)=>{
    const cancelled=error.name==='AbortError'||(error.name==='InvalidStateError'&&/viewport.*chang/i.test(error.message));
    if(!cancelled)throw error;
  });
});
document.addEventListener('astro:page-load',initializePage);
initializePage();
