// Runs in the isolated world, only after an exact optional host grant.
export function capture(mode) {
  if (document.visibilityState !== 'visible' || document.querySelector('input[type=password],input[autocomplete="cc-number"],input[autocomplete="current-password"]')) return null;
  const visible = el => !!el && !!el.getClientRects().length && !el.closest('form,input,textarea,[contenteditable=true],[hidden],[aria-hidden=true]');
  const scrub = s => String(s || '').replace(/\b(?:sk-[\w-]+|gh[pousr]_[\w]+|Bearer\s+\S+|(?:password|secret|token|api[_ -]?key)\s*[:=]\s*\S+)\b/gi,'[redacted]').replace(/\b(?:\d[ -]?){13,19}\b/g,'[redacted]');
  const selection = window.getSelection();
  const selectionSafe = selection?.anchorNode && visible(selection.anchorNode.parentElement) && selection?.focusNode && visible(selection.focusNode.parentElement);
  let excerpt = '';
  if (mode === 'excerpt') {
    const root = document.querySelector('main,article,[role=main]');
    if(root) { const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n, visits=0;while((n=walker.nextNode())&&visits++<500&&excerpt.length<1500)if(n.parentElement&&visible(n.parentElement)&&!n.parentElement.closest('script,style,nav,aside,footer'))excerpt+=' '+n.textContent.trim(); }
  }
  return {title:scrub(document.title).slice(0,300),headings:[...document.querySelectorAll('h1,h2,h3')].slice(0,40).filter(visible).slice(0,8).map(el=>scrub(el.innerText).slice(0,200)),description:scrub(document.querySelector('meta[name=description]')?.content).slice(0,500),selection:mode==='selection'&&selectionSafe?scrub(selection.toString()).slice(0,1500):'',excerpt:scrub(excerpt).slice(0,1500)};
}
