export function escapeHtml(text: string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    "`": '&#96;',
  } as const;

  return text.replace(/[&<>"']/g, (m) => {
    return map[m as '&' | '<' | '>' | '"' | "'"];
  });
}
