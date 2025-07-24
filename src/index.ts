export const isProd = process.env.NODE_ENV === "production";
const version = isProd ? "{SCRIPT_VERSION}" : "Dev";

import { altcha } from "./modules/createSocket";
import resetGame from "./modules/resetGame";
import PlayerClient from "./PlayerClient";
import EntityRenderer from "./rendering/EntityRenderer";
import ObjectRenderer from "./rendering/ObjectRenderer";
import Renderer from "./rendering/Renderer";
import GameUI from "./UI/GameUI";
import StoreHandler from "./UI/StoreHandler";
import UI from "./UI/UI";
import DataHandler from "./utility/DataHandler";
import Logger from "./utility/Logger";
import settings from "./utility/Settings";

const loadedFast = document.head === null;
if (!loadedFast) {
    Logger.warn("Glotus Client loading warning! It is generally recommended to use faster injection mode.");
}
Logger.test("Glotus Client initialization..");

const gameToken = altcha.generate(false);
export const client = new PlayerClient();
window.WebSocket = new Proxy(WebSocket, {
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
    myClient: client,
    settings: settings,
    Renderer: Renderer,
    DataHandler: DataHandler,
    hooks: {
        EntityRenderer,
        ObjectRenderer,
    },
    version,
    async startGame() {
        win.gameInit(await gameToken);
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
    const altcha_checkbox = document.querySelector<HTMLInputElement>("#altcha_checkbox");
    if (altcha_checkbox !== null) {
        altcha_checkbox.click();
    }

    // GameUI.load();
}
window.addEventListener("load", onload);
if (document.readyState === "complete") {
    onload();
}