export function sanitizeHtml(str) {
  const escapeMap = new Map([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    /* eslint-disable-next-line */
    ["'", '&#39;'],
  ]);

  return str.replace(/[&<>"']/g, (s) => escapeMap.get(s));
}
