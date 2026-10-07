// When the app is framed (e.g. in Confluence), flag the document so CSS can
// trim page chrome, and report content height to the parent. The parent only
// needs to listen for { type: "resize", height }; if it doesn't, this is inert.
export function initEmbed(): void {
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true; // cross-origin access to window.top threw: we are framed
  }
  if (!embedded) return;

  document.documentElement.classList.add("embedded");

  let last = 0;
  const send = () => {
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (height === last) return;
    last = height;
    window.parent.postMessage({ type: "resize", height }, "*");
  };
  new ResizeObserver(send).observe(document.documentElement);
  send();
}
