import { isProd } from "..";

export default class Logger {
    static readonly staticLog = console.log;
    static readonly staticError = console.error;
    static readonly staticWarn = console.warn;
    static log(...args: any) {
        if (isProd) return;
        this.staticLog(...args);
    }

    static error(...args: any) {
        if (isProd) return;
        this.staticError(...args);
    }

    static warn(...args: any) {
        if (isProd) return;
        this.staticWarn(...args);
    }

    static test(...args: any) {
        if (isProd) return;
        this.log(...args);
    }
    
    private static readonly timers: Map<string, number> = new Map;
    
    static start(label: string) {
        if (isProd) return;
        this.timers.set(label, performance.now());
    }

    static end(label: string, ...args: any[]) {
        if (isProd) return;
        if (this.timers.has(label)) {
            this.log(`${label}: ${performance.now() - this.timers.get(label)!}`, ...args);
        }
        this.timers.delete(label);
    }
}