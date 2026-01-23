import { toRadians } from './../utility/Common';
import type PlayerClient from "../PlayerClient";
import type { EItem, EWeapon } from "../types/Items";
import { SocketClient, type IEncoder } from "../types/Socket";
import { EStoreAction, type EStoreType } from "../types/Store";
import GameUI from "../UI/GameUI";

export default class PacketManager {
    private readonly client: PlayerClient;
    Encoder: any = null;
    Decoder: any = null;

    private packetCount = 0;
    constructor(client: PlayerClient) {
        this.client = client;

        if (this.client.isOwner) {
            setInterval(() => {
                GameUI.updatePackets(this.packetCount);
                this.packetCount = 0;
            }, 1000);
        }
    }

    private send(data: any) {
        const { socket, socketSend } = this.client.SocketManager;
        if (
            socket === null ||
            socket.readyState !== socket.OPEN ||
            this.Encoder === null ||
            socketSend === null
        ) return;

        const [type, ...args] = data;
        const encoded = this.Encoder.encode([type, args]);
        socketSend(encoded);

        if (this.client.isOwner) {
            this.packetCount += 1;
        }
    }

    clanRequest(id: number, accept: boolean) {
        this.send([SocketClient.ACCEPT_CLAN_JOIN_REQUEST, id, Number(accept)]);
    }

    kick(id: number) {
        this.send([SocketClient.KICK_FROM_CLAN, id]);
    }

    joinClan(name: string) {
        this.send([SocketClient.JOIN_CLAN, name]);
    }

    createClan(name: string) {
        this.send([SocketClient.CREATE_CLAN, name]);
    }

    leaveClan() {
        this.client.myPlayer.joinRequests.length = 0;
        this.send([SocketClient.LEAVE_CLAN]);
    }

    equip(type: EStoreType, id: number) {
        this.send([SocketClient.STORE, EStoreAction.EQUIP, id, type]);
    }

    buy(type: EStoreType, id: number) {
        this.send([SocketClient.STORE, EStoreAction.BUY, id, type]);
    }

    chat(message: string) {
        this.send([SocketClient.CHAT, message]);
    }

    attack(angle: number | null) {
        // angle = angle || 0;
        // const offset = Math.PI * 2 * 100000000;
        // this.send([SocketClient.ATTACK, 1, angle + offset]);
        this.send([SocketClient.ATTACK, 1, angle]);
    }

    stopAttack() {
        this.send([SocketClient.ATTACK, 0, null]);
    }

    resetMoveDir() {
        this.send([SocketClient.RESET_MOVE_DIR]);
    }

    move(angle: number | null) {
        this.send([SocketClient.MOVE, angle]);
    }

    autoAttack() {
        this.send([SocketClient.PLAYER_CONTROL, 1]);
    }

    lockRotation() {
        this.send([SocketClient.PLAYER_CONTROL, 0]);
    }

    pingMap() {
        this.send([SocketClient.PING_MAP]);
    }

    selectItemByID(id: EWeapon | EItem, type: boolean) {
        this.send([SocketClient.SELECT_ITEM, id, type]);
    }

    spawn(name: string, moofoll: 1 | 0, skin: any) {
        this.send([SocketClient.SPAWN, { name, moofoll, skin }]);
    }

    upgradeItem(id: number) {
        this.send([SocketClient.UPGRADE_ITEM, id]);
    }

    updateAngle(radians: number) {
        this.send([SocketClient.ANGLE, radians]);
    }

    pingRequest() {
        this.client.SocketManager.startPing = performance.now();
        this.send([SocketClient.PING_REQUEST]);
    }
}