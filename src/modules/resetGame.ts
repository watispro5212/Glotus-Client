import { client, Glotus } from "..";
import Hooker, { blockProperty } from "../utility/Hooker";
import Logger from "../utility/Logger";
import CustomStorage from "../utility/CustomStorage";
import Injector from "./Injector";
import settings from "../utility/Settings";

const resetGame = (loadedFast: boolean) => {
    const scriptExecuteHandler = (node: HTMLElement) => {
        node.addEventListener("beforescriptexecute", event => {
            event.preventDefault();
        }, { once: true });
        node.remove();
    }

    let scriptBundle: HTMLScriptElement | null = null;
    const handleScriptElement = (node: HTMLElement) => {
        const isScript = node instanceof HTMLScriptElement;
        const isLink = node instanceof HTMLLinkElement;
        const regex = /frvr|jquery|howler|assets|cookie|securepubads|google|ads/i;
        if (isScript && regex.test(node.src) || isLink && regex.test(node.href) || regex.test(node.innerHTML)) {
            scriptExecuteHandler(node);
        }
        
        if (isScript && /assets.+\.js$/.test(node.src) && scriptBundle === null) {
            scriptBundle = node;
            Logger.test("Found script element, resolving..");
            scriptExecuteHandler(node);
            if (loadedFast) {
                Injector.init(node);
            }
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
                    handleScriptElement(node);
                }
            }
        }
    });
    observer.observe(document, { childList: true, subtree: true });
    document.querySelectorAll("script").forEach(handleScriptElement);
    document.querySelectorAll("link").forEach(handleScriptElement);
    document.querySelectorAll("iframe").forEach(iframe => {
        iframe.remove();
    });

    const resolvePromise = (data?: any) => new Promise<void>(function(resolve){resolve(data)});

    const win = window as any;
    blockProperty(win, "onbeforeunload");

    win.frvrSdkInitPromise = resolvePromise();
    blockProperty(win, "frvrSdkInitPromise");

    win.FRVR = {
        bootstrapper: { complete(){} },
        tracker: { levelStart(){} },
        ads: { show(){return resolvePromise()} },
        channelCharacteristics: { allowNavigation: true },
        setChannel(){},
    }
    blockProperty(win, "FRVR");

    if (!loadedFast) {
        const _define = win.customElements.define;
        win.customElements.define = function() {
            win.customElements.define = _define;
        }

        win.requestAnimFrame = function() {
            delete win.requestAnimFrame;
            if (scriptBundle !== null) {
                Injector.init(scriptBundle);
            }
        }
        blockProperty(win, "requestAnimFrame");
    }

    const _fetch = window.fetch;
    window.fetch = new Proxy(_fetch, {
        apply(target, _this, args: Parameters<typeof fetch>) {
            const link = args[0];
            if (typeof link === "string") {
                if (/ping/.test(link)) {
                    return resolvePromise();
                }
            }
            return target.apply(_this, args);
        }
    });

    // Makes you to have 100 of each resources on spawn
    CustomStorage.set("moofoll", 1);
    if (CustomStorage.get("skin_color") === null) {
        CustomStorage.set("skin_color", "toString");
    }

    // Removes default keydown and keyup handlers
    window.addEventListener = new Proxy(window.addEventListener, {
        apply(target, _this, args: Parameters<typeof addEventListener>) {
            if (["keydown", "keyup"].includes(args[0]) && args[2] === undefined) {
                if (args[0] === "keyup" && loadedFast) {
                    window.addEventListener = target;
                }
                return null;
            }

            return target.apply(_this, args);
        }
    });

    // Removes default mouse handlers
    const proto = HTMLDivElement.prototype;
    proto.addEventListener = new Proxy(proto.addEventListener, {
        apply(target, _this, args: Parameters<typeof addEventListener>) {
            if (_this.id === "touch-controls-fullscreen" && /^mouse/.test(args[0]) && args[2] === false) {
                if (/up$/.test(args[0]) && loadedFast) {
                    proto.addEventListener = target;
                }
                return null;
            }
            return target.apply(_this, args);
        }
    });

    window.setInterval = new Proxy(window.setInterval, {
        apply(target, _this, args: Parameters<typeof setInterval>) {
            if (/cordova/.test(args[0].toString()) && args[1] === 1000) {
                if (loadedFast) {
                    window.setInterval = target;
                }
                return null;
            }
            return target.apply(_this, args);
        }
    });

    const deleteProp = (target: any, name: any) => {
        delete target[name];
    }
    
    Hooker.createRecursiveHook(
        window, "config",
        (that, config) => {
            deleteProp(that, "openLink");
            deleteProp(that, "aJoinReq");
            deleteProp(that, "follmoo");
            deleteProp(that, "kickFromClan");
            deleteProp(that, "sendJoin");
            deleteProp(that, "leaveAlliance");
            deleteProp(that, "createAlliance");
            deleteProp(that, "storeBuy");
            deleteProp(that, "storeEquip");
            deleteProp(that, "showItemInfo");
            deleteProp(that, "selectSkinColor");
            // deleteProp(that, "changeStoreIndex");
            deleteProp(that, "config");
            deleteProp(that, "altchaCreateWorker");
            deleteProp(that, "captchaCallbackHook");
            deleteProp(that, "showPreAd");
            deleteProp(that, "setUsingTouch");

            that.addEventListener("blur", that.onblur);
            deleteProp(that, "onblur");
            
            that.addEventListener("focus", that.onfocus);
            deleteProp(that, "onfocus");

            Glotus.config = config;
            return loadedFast;
        }
    );

    Hooker.createRecursiveHook(
        Object.prototype, "initialBufferSize",
        (_this) => {
            client.PacketManager.Encoder = _this;
            return true;
        }
    );

    Hooker.createRecursiveHook(
        Object.prototype, "maxExtLength",
        (_this) => {
            client.PacketManager.Decoder = _this;
            return true;
        }
    );

    const patterns = {
        "./img/hats/hat_12.png": "https://i.postimg.cc/BQPfhPwD/Booster-V2.png",
        "./img/hats/hat_23.png": "https://i.postimg.cc/WpHP6wST/Anti-Venom-Gear.png",
        "./img/hats/hat_6.png": "https://i.postimg.cc/662BPP8y/Soldier-Helmet.png",
        "./img/hats/hat_15.png": "https://i.postimg.cc/pXKRWnYv/Winter-Cap.png",
        "./img/hats/hat_7.png": "https://i.postimg.cc/zGnZNZNG/Bull-Helmet-V2.png",
        "./img/hats/hat_58.png": "https://i.postimg.cc/B67RpJTM/Bushido-Armor.png",
        "./img/hats/hat_8.png": "https://i.postimg.cc/XJYT9rCr/Bummel-Hat.png",
        "./img/hats/hat_5.png": "https://i.postimg.cc/hvJ63NMg/Cowboy-Hat.png",
        "./img/hats/hat_50.png": "https://i.postimg.cc/y8h55mhJ/Honeycrisp-Hat.png",
        "./img/hats/hat_18.png": "https://i.postimg.cc/RhjyrGbt/Explorer-Hat-V2.png",
        "./img/hats/hat_27.png": "https://i.postimg.cc/mkFpSC2g/Scavenger-Gear.png",
        "./img/hats/hat_26.png": "https://i.postimg.cc/t40Q8RLc/Barbarian-Armor.png",
        "./img/hats/hat_20.png": "https://i.postimg.cc/Dmkjp08d/Samurai-Hat.png",
        "./img/hats/hat_22.png": "https://i.postimg.cc/5t3hHB6c/Emp-Helmet.png",
        "./img/hats/hat_13.png": "https://i.postimg.cc/BvqyGjNm/Medic-Gear-V2.png",
        "./img/hats/hat_9.png": "https://i.postimg.cc/g0N7cGTm/Miner.png",
        "./img/hats/hat_4.png": "https://i.postimg.cc/Tw14pBzm/Ranger-Hat.png",
        "./img/hats/hat_31.png": "https://i.postimg.cc/2SNM2cWR/Flipper-Hat.png",
        "./img/hats/hat_1.png": "https://i.postimg.cc/fWF60TTb/Fiddler-Hat.png",
        "./img/hats/hat_11.png": "https://i.postimg.cc/7PFqrNzX/Spike-V2.png",
        "./img/hats/hat_11_p.png": "https://i.postimg.cc/7PFqrNzX/Spike-V2.png",
        "./img/hats/hat_11_top.png": "",
    };

    if (settings._texturepack) {
        const imageDesc = Object.getOwnPropertyDescriptor(Image.prototype, "src")!;
        Object.defineProperty(Image.prototype, "src", {
            get() {
                return imageDesc.get?.call(this);
            },
            set(value: string) {
                if (value in patterns) {
                    // @ts-ignore
                    value = patterns[value];
                }

                if (value === "") return;
                return imageDesc.set?.call(this, value);
            },
            configurable: true,
        })
    }

    const _proto_ = Object.prototype as any;
    Object.defineProperty(_proto_, "processServers", {
        set(value) {
            delete _proto_.processServers;
            this.processServers = function(data: any) {
                for (const server of data) {
                    server.playerCapacity += 1;
                }
                return value.call(this, data);
            }
        },
        configurable: true
    });
}

export default resetGame;