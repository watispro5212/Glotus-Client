import { isProd } from "..";
import GameUI from "../UI/GameUI";

export default class Logger {
    static readonly staticLog = console.log;
    static readonly staticError = console.error;
    static readonly staticWarn = console.warn;
    static log(msg: any) {
        GameUI.addCacheMessage(["log", msg]);
        if (isProd) return;
        this.staticLog(msg);
    }

    static error(msg: any) {
        GameUI.addCacheMessage(["error", msg]);
        if (isProd) return;
        this.staticError(msg);
    }

    static warn(msg: any) {
        GameUI.addCacheMessage(["warn", msg]);
        if (isProd) return;
        this.staticWarn(msg);
    }

    static test(msg: any) {
        GameUI.addCacheMessage(["log", msg]);
        if (isProd) return;
        this.staticLog(msg);
    }
    
    // private static readonly timers: Map<string, number> = new Map;
    
    // static start(label: string) {
    //     if (isProd) return;
    //     this.timers.set(label, performance.now());
    // }

    // static end(label: string, msg: any) {
    //     if (isProd) return;
    //     if (this.timers.has(label)) {
    //         this.log(`${label}: ${performance.now() - this.timers.get(label)!}`, msg);
    //     }
    //     this.timers.delete(label);
    // }
}