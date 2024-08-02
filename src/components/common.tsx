export type EthereumProvider = {
    request(...args: unknown[]): Promise<unknown>,
    on(e: string, handler: (x: string) => void): void,
}