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

export function abbreviatedAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export type EthereumProvider = {
    request(...args: unknown[]): Promise<unknown>,
    on(e: string, handler: (x: string) => void): void,
}
