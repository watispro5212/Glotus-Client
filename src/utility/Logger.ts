import { isProd } from "..";
import GameUI from "../UI/GameUI";

export default class Logger {
    static readonly staticLog = console?.log || function(){};
    static readonly staticError = console?.error || function(){};
    static readonly staticWarn = console?.warn || function(){};
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
}