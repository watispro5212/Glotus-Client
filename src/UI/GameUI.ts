import { client, Glotus } from "..";
import Config from "../constants/Config";
import { Items } from "../constants/Items";
import { ItemGroup } from "../types/Items";
import { formatDate, getTargetValue } from "../utility/Common";
import CustomStorage from "../utility/CustomStorage";
import settings from "../utility/Settings";
import StoreHandler from "./StoreHandler";

const GameUI = new class GameUI {

    /** Returns game html elements */
    getElements() {
        const querySelector = document.querySelector.bind(document);
        const querySelectorAll = document.querySelectorAll.bind(document);
        return {
            gameCanvas: querySelector<HTMLCanvasElement>("#gameCanvas")!,
            chatHolder: querySelector<HTMLInputElement>("#chatHolder")!,
            storeHolder: querySelector<HTMLDivElement>("#storeHolder")!,
            chatBox: querySelector<HTMLInputElement>("#chatBox")!,
            storeMenu: querySelector<HTMLDivElement>("#storeMenu")!,
            allianceMenu: querySelector<HTMLDivElement>("#allianceMenu")!,
            storeContainer: querySelector<HTMLDivElement>("#storeContainer")!,
            itemHolder: querySelector<HTMLDivElement>("#itemHolder")!,
            gameUI: querySelector<HTMLDivElement>("#gameUI")!,
            clanMenu: querySelector<HTMLDivElement>("#allianceMenu")!,
            storeButton: querySelector<HTMLDivElement>("#storeButton")!,
            clanButton: querySelector<HTMLDivElement>("#allianceButton")!,
            setupCard: querySelector<HTMLDivElement>("#setupCard")!,
            serverBrowser: querySelector<HTMLSelectElement>("#serverBrowser")!,
            skinColorHolder: querySelector<HTMLDivElement>("#skinColorHolder")!,
            settingRadio: querySelectorAll<HTMLDivElement>(".settingRadio")!,
            pingDisplay: querySelector<HTMLDivElement>("#pingDisplay")!,
            enterGame: querySelector<HTMLDivElement>("#enterGame")!,
            nameInput: querySelector<HTMLInputElement>("#nameInput")!,
            allianceInput: querySelector<HTMLInputElement>("#allianceInput")!,
            allianceButton: querySelector<HTMLDivElement>("#allianceButton")!,
            noticationDisplay: querySelector<HTMLDivElement>("#noticationDisplay")!,
            nativeResolution: querySelector<HTMLInputElement>("#nativeResolution")!,
            showPing: querySelector<HTMLInputElement>("#showPing")!,
            mapDisplay: querySelector<HTMLCanvasElement>("#mapDisplay")!,
            chatLog: querySelector<HTMLDivElement>("#chatLog")!,
        } as const;
    }

    selectSkinColor(skin: number) {
        const skinValue = skin === 10 ? "toString" : skin;
        CustomStorage.set("skin_color", skinValue);
        const selectSkin = getTargetValue(window, "selectSkinColor");
        if (selectSkin !== undefined) {
            selectSkin(skinValue);
        }
        return skinValue;
    }

    private createSkinColors() {
        const skin_color = CustomStorage.get<"toString" | number>("skin_color") || 0;
        const index = skin_color === "toString" ? 10 : skin_color;
        const { setupCard } = this.getElements();

        const skinHolder = document.createElement("div");
        skinHolder.id = "skinHolder";
        let prevIndex = index;
        for (let i=0;i<Config.skinColors.length;i++) {
            const color = Config.skinColors[i]!;
            const div = document.createElement("div");
            div.classList.add("skinColorItem");
            if (i === index) {
                div.classList.add("activeSkin");
            }
            div.style.backgroundColor = color;
            div.onclick = () => {
                const colorButton = skinHolder.childNodes[prevIndex];
                if (colorButton instanceof HTMLDivElement) {
                    colorButton.classList.remove("activeSkin");
                }
                div.classList.add("activeSkin");
                prevIndex = i;
                this.selectSkinColor(i);
            }
            skinHolder.appendChild(div);
        }
        setupCard.appendChild(skinHolder);
    }

    private formatMainMenu() {
        const { setupCard, serverBrowser, settingRadio, gameUI } = this.getElements();
        setupCard.appendChild(serverBrowser);
        setupCard.querySelector("br")?.remove();
        this.createSkinColors();

        const radio = settingRadio[0];
        if (radio) {
            setupCard.appendChild(radio);
        }

        const div = document.createElement("div");
        div.id = "glotusStats";
        div.innerHTML = `
            <span>PING: <span id="glotusPing"></span>ms</span>
            <span>FPS: <span id="glotusFPS"></span></span>
            <span>PACKETS: <span id="glotusPackets"></span></span>
            <span>FastQ: <span id="glotusFastQ">false</span></span>
            <span>Places: <span id="glotusPlaces">0</span></span>
            <span>Total Kills: <span id="glotusTotalKills">0</span></span>
            <span>Deaths: <span id="glotusTotalDeaths">0</span></span>
            <span>Module: <span id="glotusActiveModule">null</span></span>
            <span>SpikeDmg: <span id="glotusSpikeDamage"></span></span>
            <span>PotDmg: <span id="glotusPotentialDamage"></span></span>
            <span>Danger: <span id="glotusDangerState"></span></span>
            <span>Hat: <span id="glotusEquipHat">0</span></span>
            <span>CollideSpike: <span id="glotusCollideSpike"></span></span>
        `;
        gameUI.appendChild(div);
    }

    /** Adds item counts to the inventory. So you can see amount of placed items */
    private attachItemCount() {
        const actionBar = document.querySelectorAll<HTMLDivElement>("div[id*='actionBarItem'");
        for (let i=19;i<39;i++) {
            const item = Items[i - 16];
            if (
                actionBar[i] instanceof HTMLDivElement &&
                item !== undefined &&
                "itemGroup" in item
            ) {
                const group = item.itemGroup;
                const span = document.createElement("span");
                span.classList.add("itemCounter");
                span.setAttribute("data-id", group + "");

                const { count, limit } = client.myPlayer.getItemCount(group);
                span.textContent = `${count}/${limit}`;
                actionBar[i]!.appendChild(span);
            }
        }
    }

    private modifyInputs() {
        const { chatHolder, chatBox, nameInput } = this.getElements();
        chatBox.onblur = () => {
            chatHolder.style.display = "none";
            const value = chatBox.value;
            if (value.length > 0) {
                client.PacketManager.chat(value);
            }
            chatBox.value = "";
        }

        nameInput.onchange = () => {
            CustomStorage.set("moo_name", nameInput.value, false);
        }
    }

    /** Updates item count of items in inventory */
    updateItemCount(group: ItemGroup) {
        const items = document.querySelectorAll<HTMLSpanElement>(`span.itemCounter[data-id='${group}']`);
        const { count, limit } = client.myPlayer.getItemCount(group);
        for (const item of items) {
            item.textContent = `${count}/${limit}`;
        }
    }

    private interceptEnterGame() {
        const enterGame = document.querySelector<HTMLDivElement>("#enterGame")!;
        const observer = new MutationObserver(() => {
            observer.disconnect();

            this.load();
            // this.spawn();
        });
        observer.observe(enterGame, { attributes: true });
    }

    updatePing(ping: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusPing");
        if (span !== null) {
            span.textContent = ping.toString();
        }
    }

    updateFPS(fps: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusFPS");
        if (span !== null) {
            span.textContent = fps.toString();
        }
    }

    updatePackets(packets: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusPackets");
        if (span !== null) {
            span.textContent = packets.toString();
        }
    }

    updateFastQ(state: boolean) {
        const span = document.querySelector<HTMLSpanElement>("#glotusFastQ");
        if (span !== null) {
            span.textContent = state.toString();
        }
    }

    updatePlaces(count: number) {
        // const span = document.querySelector<HTMLSpanElement>("#glotusPlaces");
        // if (span !== null) {
            //  span.textContent = count.toString();
        // }
    }

    updateTotalKills(kills: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusTotalKills");
        if (span !== null) {
            span.textContent = kills.toString();
        }
    }

    updateTotalDeaths(deaths: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusTotalDeaths");
        if (span !== null) {
            span.textContent = deaths.toString();
        }
    }

    updateActiveModule(name: string | null) {
        const span = document.querySelector<HTMLSpanElement>("#glotusActiveModule");
        if (span !== null) {
            span.textContent = name + "";
        }
    }

    updateSpikeDamage(state: number) {
        const span = document.querySelector<HTMLSpanElement>("#glotusSpikeDamage");
        if (span !== null) {
            span.textContent = state + "";
        }
    }

    updatePotentialDamage(state: string) {
        const span = document.querySelector<HTMLSpanElement>("#glotusPotentialDamage");
        if (span !== null) {
            span.textContent = state + "";
        }
    }

    updateCollideSpike(state: boolean) {
        const span = document.querySelector<HTMLSpanElement>("#glotusCollideSpike");
        if (span !== null) {
            span.textContent = state + "";
        }
    }

    updateDangerState(state: string) {
        const span = document.querySelector<HTMLSpanElement>("#glotusDangerState");
        if (span !== null) {
            span.textContent = state + "";
        }
    }

    updateEquipHat(state: string) {
        const span = document.querySelector<HTMLSpanElement>("#glotusEquipHat");
        if (span !== null) {
            span.textContent = state + "";
        }
    }

    init() {
        this.formatMainMenu();
        this.modifyInputs();
        this.interceptEnterGame();
    }
    
    private load() {
        const { nativeResolution, enterGame } = this.getElements();

        if (!nativeResolution.checked) nativeResolution.click();
        this.selectSkinColor(CustomStorage.get("skin_color") || 0);

        const enterGameButton = enterGame as any;
        let _enterGame = enterGameButton.onclick;
        enterGameButton.onclick = function() {
            delete enterGameButton.onclick;

            Glotus.startGame();
            enterGameButton.onclick = _enterGame;
        }

        Object.defineProperty(enterGameButton, "onclick", {
            set(callback) {
                _enterGame = callback;
            },
            configurable: true
        });
    }

    loadGame() {
        this.attachItemCount();

        // MAKE SURE OPENING DEFAULT STORE/CLAN BUTTON WILL REMOVE OUR CUSTOM SHOP
        const { storeButton, allianceButton, mapDisplay } = this.getElements();
        const that = this;
        let _storeClick = storeButton.onclick!;
        storeButton.onclick = function(...args: any) {
            that.reset();
            _storeClick.apply(this, args);
        }

        const _allianceClick = allianceButton.onclick!;
        allianceButton.onclick = function(...args: any) {
            that.reset();
            _allianceClick.apply(this, args);
        }

        const _mapClick = mapDisplay.onclick!;
        mapDisplay.onclick = function(event: PointerEvent) {
            const bounds = mapDisplay.getBoundingClientRect();
            const scale = 14400 / bounds.width;
            const posX = (event.clientX - bounds.left) * scale;
            const posY = (event.clientY - bounds.top) * scale;
            client.ModuleHandler.endTarget.setXY(posX, posY);
            client.ModuleHandler.followPath = true;
            _mapClick.call(this, event);
        }

        this.createChatLog();
    }

    /** Checks if element is opened. Used for store, clan and chat */
    private isOpened(element: HTMLElement) {
        return element.style.display !== "none";
    }

    /** Closes all popups except.. */
    closePopups(element?: HTMLElement) {
        const { allianceMenu, clanButton } = this.getElements();
        if (this.isOpened(allianceMenu) && element !== allianceMenu) {
            clanButton.click();
        }

        const popups = document.querySelectorAll<HTMLDivElement>("#chatHolder, #storeMenu, #allianceMenu, #storeContainer");
        for (const popup of popups) {
            if (popup === element) continue;
            popup.style.display = "none";
        }

        if (element instanceof HTMLElement) {
            element.style.display = this.isOpened(element) ? "none" : "";
        }
    }

    private createAcceptButton(type: 0 | 1) {
        const data = [["#cc5151", "&#xE14C;"], ["#8ecc51", "&#xE876;"]] as const;
        const [color, code] = data[type];
        const button = document.createElement("div");
        button.classList.add("notifButton");
        button.innerHTML = `<i class="material-icons" style="font-size:28px; color:${color};">${code}</i>`;
        return button;
    }

    private resetNotication(noticationDisplay: HTMLDivElement) {
        noticationDisplay.innerHTML = "";
        noticationDisplay.style.display = "none";
    }

    clearNotication() {
        const { noticationDisplay } = this.getElements();
        this.resetNotication(noticationDisplay);
    }

    createRequest(user: [number, string]) {
        const [id, name] = user;
        const { noticationDisplay } = this.getElements();
        if (noticationDisplay.style.display !== "none") return;

        noticationDisplay.innerHTML = "";
        noticationDisplay.style.display = "block";

        const text = document.createElement("div");
        text.classList.add("notificationText");
        text.textContent = name;
        noticationDisplay.appendChild(text);

        const handleClick = (type: 0 | 1) => {
            const button = this.createAcceptButton(type);
            button.onclick = () => {
                this.resetNotication(noticationDisplay);
                client.PacketManager.clanRequest(id, !!type);
                client.myPlayer.joinRequests.shift();
                client.pendingJoins.delete(id);
            }
            noticationDisplay.appendChild(button);
        }
        handleClick(0);
        handleClick(1);
    }

    clientSpawn() {
        const { enterGame } = this.getElements();
        enterGame.click();
    }
    
    handleEnter(event: KeyboardEvent) {
        // if (UI.isMenuOpened) return;
        const { allianceInput, allianceButton } = this.getElements();
        const active = document.activeElement;

        if (client.myPlayer.inGame) {
            if (active === allianceInput) {
                allianceButton.click();
            } else {
                this.toggleChat(event);
            }
            return;
        }

        this.clientSpawn();
    }

    private toggleChat(event: KeyboardEvent) {
        const { chatHolder, chatBox } = this.getElements();
        this.closePopups(chatHolder);
        if (this.isOpened(chatHolder)) {
            event.preventDefault();
            chatBox.focus();
        } else {
            chatBox.blur();
        }
    }

    reset() {
        StoreHandler.closeStore();
    }

    openClanMenu() {
        const { clanButton } = this.getElements();
        this.reset();
        clanButton.click();
    }

    readonly logCache: ["log" | "warn" | "error", any][] = [];
    private chatLog: HTMLDivElement | null = null;
    addLogMessage(cache: any) {
        const [ type, message ] = cache;
        const div = document.createElement("div");
        div.className = "logMessage";
        div.innerHTML = `
            <span class="darken">${formatDate()}</span>
            <span class="messageContent ${type}"></span>
        `;
        div.querySelector(".messageContent")!.textContent = message;

        const messageContainer = document.querySelector<HTMLDivElement>("#messageContainer");
        if (messageContainer !== null) {
            messageContainer.appendChild(div);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }

    addCacheMessage(cache: ["log" | "warn" | "error", any]) {
        if (this.chatLog === null) {
            this.logCache.push(cache);
        } else {
            this.addLogMessage(cache);
        }
    }

    createChatLog() {
        if (this.chatLog !== null) return;

        const container = document.createElement("div");
        container.id = "chatLog";
        container.innerHTML = `
            <h1 id="chatLogHeader">DevTools Chat Log</h1>
            <div id="messageContainer"></div>
        `

        document.body.appendChild(container);

        this.chatLog = container;

        for (const log of this.logCache) {
            this.addLogMessage(log);
        }
    }

    toggleChatLog() {
        if (this.chatLog === null) {
            this.createChatLog();
        }

        if (settings._chatLog) {
            this.chatLog!.classList.remove("hidden");
        } else {
            this.chatLog!.classList.add("hidden");
        }
    }

    private readonly lastMessages: string[] = [];
    handleMessageLog(message: string) {
        message = message.trim().replace(/\s+/g, " ");
        if (this.lastMessages.length > 3) {
            this.lastMessages.shift();
        }

        if (this.lastMessages.includes(message)) return;
        this.lastMessages.push(message);

        this.addLogMessage(["log", message]);
    }
}

export default GameUI;