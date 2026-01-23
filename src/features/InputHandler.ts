import type Player from "../data/Player";
import Vector from "../modules/Vector";
import ZoomHandler from "../modules/ZoomHandler";
import type PlayerClient from "../PlayerClient";
import { EAttack } from "../types/Enums";
import { ItemType, WeaponType } from "../types/Items";
import GameUI from "../UI/GameUI";
import StoreHandler from "../UI/StoreHandler";
import UI from "../UI/UI";
import { formatButton, getAngle, getAngleFromBitmask, isActiveInput } from "../utility/Common";
import settings from "../utility/Settings";

export default class InputHandler {
    private readonly client: PlayerClient;

    /** A list of placement hotkeys that are currently pressed */
    private readonly hotkeys = new Map<string, ItemType>();
    // readonly mousePosition = new Vector(0, 0);
    /** bitmask, which represents movement direction */
    move!: number;

    lastPosition = new Vector(0, 0);

    /** true, if bot position is locked to specific point on the map */
    lockPosition = false;

    readonly mouse = {
        x: 0,
        y: 0,

        /** Current mouse angle, not including rotation */
        angle: 0,
    }

    /** true, if player rotation is enabled */
    rotation = true;

    instaToggle = false;
    instakillTarget: Player | null = null;

    constructor(client: PlayerClient) {
        this.client = client;
        this.reset();
    }

    instaReset() {
        this.instaToggle = false;
        this.instakillTarget = null;
    }

    reset() {
        this.hotkeys.clear();
        this.move = 0;

        this.instaReset();
    }

    init() {
        window.addEventListener("keydown", event => this.handleKeydown(event), true);
        window.addEventListener("keyup", event => this.handleKeyup(event), true);

        window.addEventListener("mousedown", event => this.handleMousedown(event), true);
        window.addEventListener("mouseup", event => this.handleMouseup(event), true);
        window.addEventListener("mousemove", event => this.handleMouseMove(event), true);
        window.addEventListener("mouseover", event => this.handleMouseMove(event), true);
        window.addEventListener("wheel", event => ZoomHandler.handler(event), true);
    }

    private placementHandler(type: ItemType, code: string) {
        const item = this.client.myPlayer.getItemByType(type);
        if (item === null) return;
        this.hotkeys.set(code, type);
        this.client.ModuleHandler.startPlacement(type);

        const { isOwner, clients } = this.client;
        if (isOwner) {
            for (const client of clients) {
                client.ModuleHandler.startPlacement(type);
            } 
        }
    }

    /** returns a vector of cursor position relative to the map */
    cursorPosition(force = false) {
        if (!force && this.lockPosition) return this.lastPosition;

        const { myPlayer } = this.client;
        const pos = myPlayer.pos.future;
        const { w, h } = ZoomHandler.scale.current;
        const scale = Math.max(window.innerWidth / w, window.innerHeight / h);
        const cursorX = (this.mouse.x - window.innerWidth / 2) / scale;
        const cursorY = (this.mouse.y - window.innerHeight / 2) / scale;
        return new Vector(pos.x + cursorX, pos.y + cursorY);
    }

    getMovePosition(force = false) {
        if (!force && this.lockPosition) return this.lastPosition;

        if (settings._followCursor) return this.cursorPosition(true);
        const { myPlayer, ModuleHandler } = this.client;

        if (ModuleHandler.move_dir !== null) {
            return myPlayer.pos.current.addDirection(ModuleHandler.move_dir, settings._movementRadius);
        }
        return myPlayer.pos.future;
    }

    postTick() {
        // const { isOwner, clients, myPlayer } = this.client;
        // if (isOwner && !this.lockPosition) {
        //     const pos = myPlayer.pos.current;
        //     const cursor = this.cursorPosition();

        //     for (const client of clients) {
        //         client.ModuleHandler.setFollowTarget(pos.x, pos.y);
        //         client.ModuleHandler.setLookTarget(cursor.x, cursor.y);
        //     }
        // }
    }

    private toggleBotPosition() {
        const state = !this.lockPosition;
        if (state) {
            this.lastPosition.setVec(this.getMovePosition(true));
        }
        this.lockPosition = state;
    }

    /** Used to handle movement operations by keyboard */
    private handleMovement() {
        const angle = getAngleFromBitmask(this.move, false);
        this.client.ModuleHandler.startMovement(angle);
    }

    private toggleRotation() {
        this.rotation = !this.rotation;
        if (this.rotation) {
            this.client.ModuleHandler.currentAngle = this.mouse.angle;

            // const cursor = this.cursorPosition();
            // this.mousePosition.setVec(cursor);
        }
    }

    handleKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (event.code === "Space" && target.tagName === "BODY") {
            event.preventDefault();
        }
        if (event.ctrlKey && ["KeyD", "KeyS", "KeyW"].includes(event.code)) {
            event.preventDefault();
        }
        if (event.repeat) return;
        if (UI.isActiveButton()) return;
        
        const isInput = isActiveInput();
        if (event.code === settings._toggleMenu && !isInput) {
            UI.toggleMenu();
        }

        if (event.code === settings._toggleChat && !UI.isMenuOpened) {
            GameUI.handleEnter(event);
        }
        if (!this.client.myPlayer.inGame) return;
        if (isInput) return;

        const { ModuleHandler } = this.client;
        if (event.code === settings._food) this.placementHandler(ItemType.FOOD, event.code);
        if (event.code === settings._wall) this.placementHandler(ItemType.WALL, event.code);
        if (event.code === settings._spike) this.placementHandler(ItemType.SPIKE, event.code);
        if (event.code === settings._windmill) this.placementHandler(ItemType.WINDMILL, event.code);
        if (event.code === settings._farm) this.placementHandler(ItemType.FARM, event.code);
        if (event.code === settings._trap) this.placementHandler(ItemType.TRAP, event.code);
        if (event.code === settings._turret) this.placementHandler(ItemType.TURRET, event.code);
        if (event.code === settings._spawn) this.placementHandler(ItemType.SPAWN, event.code);

        const copyMove = this.move;
        if (event.code === settings._up) this.move |= 1;
        if (event.code === settings._left) this.move |= 4;
        if (event.code === settings._down) this.move |= 2;
        if (event.code === settings._right) this.move |= 8;
        if (copyMove !== this.move) this.handleMovement();

        if (event.code === settings._autoattack) ModuleHandler.toggleAutoattack();
        if (event.code === settings._lockrotation) this.toggleRotation();
        if (event.code === settings._lockBotPosition) this.toggleBotPosition();
        if (event.code === settings._instakill) {
            this.instaToggle = !this.instaToggle;
        }

        if (UI.isMenuOpened) return;
        if (event.code === settings._toggleShop) StoreHandler.toggleStore();
        if (event.code === settings._toggleClan) GameUI.openClanMenu();
    }

    handleKeyup(event: KeyboardEvent) {
        const { myPlayer, ModuleHandler, isOwner, clients } = this.client;
        if (!myPlayer.inGame) return;

        const copyMove = this.move;
        if (event.code === settings._up) this.move &= -2;
        if (event.code === settings._left) this.move &= -5;
        if (event.code === settings._down) this.move &= -3;
        if (event.code === settings._right) this.move &= -9;
        if (copyMove !== this.move) this.handleMovement();

        if (ModuleHandler.currentType !== null && this.hotkeys.delete(event.code)) {
            const entry = [...this.hotkeys].pop();
            const type = entry !== undefined ? entry[1] : null;
            ModuleHandler.startPlacement(type);

            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.startPlacement(type);
                }
            }
        }
    }

    private handleMousedown(event: MouseEvent) {
        if (!(event.target instanceof HTMLCanvasElement) || event.target.id === "mapDisplay") return;
        const button = formatButton(event.button);

        if (button === "MBTN") {
            this.instaToggle = !this.instaToggle;
            return;
        }

        const { isOwner, clients, ModuleHandler } = this.client;
        const state = button === "LBTN" ? EAttack.ATTACK : button === "RBTN" ? EAttack.DESTROY : null;
        if (state !== null && ModuleHandler.attacking === EAttack.DISABLED) {
            ModuleHandler.attacking = state;
            ModuleHandler.attackingState = state;

            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.staticModules.tempData.setAttacking(state);
                }
            }
        }
    }

    private handleMouseup(event: MouseEvent) {
        const button = formatButton(event.button);
        const { isOwner, clients, ModuleHandler } = this.client;

        if ((button === "LBTN" || button === "RBTN") && ModuleHandler.attacking !== EAttack.DISABLED) {
            if (!ModuleHandler.autoattack) {
                ModuleHandler.attacking = EAttack.DISABLED;
            }

            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.staticModules.tempData.setAttacking(EAttack.DISABLED);
                }
            }
        }
    }

    private handleMouseMove(event: MouseEvent) {
        const x = event.clientX;
        const y = event.clientY;
        const angle = getAngle(window.innerWidth / 2, window.innerHeight / 2, x, y);
        this.mouse.angle = angle;

        if (this.rotation) {
            this.mouse.x = x;
            this.mouse.y = y;
            this.client.ModuleHandler.currentAngle = angle;
        }
    }
}