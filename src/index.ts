export const isProd = process.env.NODE_ENV === "production";
const version = isProd ? "{SCRIPT_VERSION}" : "Dev";

import { altcha } from "./modules/createSocket";
import resetGame from "./modules/resetGame";
import Vector from "./modules/Vector";
import ZoomHandler from "./modules/ZoomHandler";
import PlayerClient from "./PlayerClient";
import EntityRenderer from "./rendering/EntityRenderer";
import ObjectRenderer from "./rendering/ObjectRenderer";
import Renderer from "./rendering/Renderer";
import GameUI from "./UI/GameUI";
import StoreHandler from "./UI/StoreHandler";
import UI from "./UI/UI";
import Logger from "./utility/Logger";
import settings from "./utility/Settings";

const loadedFast = document.head === null;
if (!loadedFast) {
    Logger.warn("Glotus Client loading warning! It is generally recommended to use faster injection mode.");
}
Logger.test("Glotus Client initialization..");

const gameToken = altcha.generate();
export const client = new PlayerClient();
window.WebSocket = new window.Proxy(window.WebSocket, {
    construct(target, args: ConstructorParameters<typeof WebSocket>) {
        const socket = new target(...args);
        Logger.test("Found socket! Socket initialization..");
        client.SocketManager.init(socket);

        window.WebSocket = target;
        return socket;
    }
});

const win = window as any;
export const Glotus = {
    _myClient: client,
    _settings: settings,
    _Renderer: Renderer,
    _ZoomHandler: ZoomHandler,
    _hooks: {
        _EntityRenderer: EntityRenderer,
        _ObjectRenderer: ObjectRenderer,
        _renderPlayer: function(){} as any,
    },
    _config: {},
    version,
    _offset: new Vector,
    _gameInit(token: string){},
    async startGame() {
        const token = await gameToken;
        if (typeof token !== "string" || token.length === 0) {
            Logger.error("Failed to generate altcha token..");
            return;
        }

        this._gameInit(token);
    }
}
win.Glotus = Glotus;
resetGame(loadedFast);

const contentLoaded = () => {
    Logger.test("Menu initialization..");
    client.InputHandler.init();
    GameUI.init();
    UI.init();
    StoreHandler.init();
}
window.addEventListener("DOMContentLoaded", contentLoaded);
if (document.readyState !== "loading") {
    contentLoaded();
}

const onload = () => {
    Logger.test("Page loaded..");
    const { enterGame } = GameUI.getElements();
    enterGame.classList.remove("disabled");
}
window.addEventListener("load", onload);
if (document.readyState === "complete") {
    onload();
}