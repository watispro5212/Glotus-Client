import { PlayerObject, Resource } from "../data/ObjectItem";
import Projectile from "../data/Projectile";
import GameUI from "../UI/GameUI";
import { SocketServer } from "../types/Socket";
import { createAction, getUniqueID } from "../utility/Common";
import Vector from "../modules/Vector";
import PlayerClient from "../PlayerClient";
import StoreHandler from "../UI/StoreHandler";
import { Projectiles } from "../constants/Items";
import { EProjectile } from "../types/Items";
import Logger from "../utility/Logger";

class SocketManager {
    private readonly client: PlayerClient;
    socket: WebSocket | null = null;
    socketSend: typeof WebSocket.prototype.send | null = null;
    /**
     * An array of actions, that should be executed after receiving all packets
     */
    private readonly PacketQueue: (() => void)[] = [];
    startPing = Date.now();

    /**
     * Time in ms between client, server and client
     */
    pong = 0;

    readonly TICK = 1000 / 9;

    packetCount = 0;
    private action: (() => void) | null = null;

    constructor(client: PlayerClient) {
        this.client = client;

        if (this.client.isOwner) {
            setInterval(() => {
                GameUI.updatePackets(this.packetCount);
                this.packetCount = 0;
            }, 1000);
        }
    }

    get isSandbox() {
        return this.socket !== null && /localhost/.test(this.socket.url);
    }

    init(socket: WebSocket) {
        this.socket = socket;
        this.socketSend = socket.send.bind(socket);
        socket.addEventListener("message", (event) => this.handleMessage(event));
        socket.addEventListener("close", event => {
            const { code, reason, wasClean } = event;
            Logger.warn(`WebSocket Closed: ${code}, '${reason}', ${wasClean}`);
        });

        socket.addEventListener("error", () => {
            Logger.error(`WebSocket Error`);
        })
        // if (!this.client.isOwner) return;
        // const that = this;
        // const _send = socket.send;
        // socket.send = function(data: Uint8Array) {
        //     const decoder = that.client.PacketManager.Decoder;
        //     if (decoder === null) return;

        //     const decoded = decoder.decode(new Uint8Array(data));
        //     const temp = [decoded[0], ...decoded[1]];
        //     switch (temp[0]) {
        //         case SocketClient.SPAWN: {
        //             // socket.send = _send;

        //             const data = temp[1];
        //             data.skin = GameUI.selectSkinColor(CustomStorage.get("skin_color") || 0);
        //             that.client.PacketManager.spawn(data.name, data.moofoll, data.skin);
        //             return;
        //         }
        //     }
        //     return _send.call(this, data);
        // }
    }

    private pingTimeout: ReturnType<typeof setTimeout> | undefined;
    private handlePing() {
        this.pong = Math.round(performance.now() - this.startPing);
        
        if (this.client.isOwner) {
            GameUI.updatePing(this.pong);
        }

        clearTimeout(this.pingTimeout);
        this.pingTimeout = setTimeout(() => {
            this.client.PacketManager.pingRequest();
        }, 3000);
    }

    private handlePlayerInit() {
        // try {
        //     const { myPlayer: myPlayer } = this.client;
        //     if (
        //         this.socket === null ||
        //         !this.client.isOwner ||
        //         !myPlayer.isMyPlayerByID(player.id) ||
        //         player.prevNickname === player.nickname
        //     ) return;
            
        //     // Notify when someone connects via Glotus Client
        //     // No other info gets collected except nickname and server player connected to..
        //     const baseURL = "https://auth-private-production.up.railway.app";
        //     const url = new URL(this.socket.url);

        //     window.fetch(baseURL + "/spawn", {
        //         method: "POST",
        //         headers: { "Content-Type": "text/plain; charset=utf-8" },
        //         body: JSON.stringify({ nickname: player.nickname || "unknown", hostname: url.hostname })
        //     });
        // } catch(err) {}
    }

    private handleMessage(event: MessageEvent<ArrayBuffer>) {
        const decoder = this.client.PacketManager.Decoder;
        if (decoder === null) return;
        
        const data = event.data;
        this.packetCount += 1;
        const decoded = decoder.decode(new Uint8Array(data));
        const temp = [decoded[0], ...decoded[1]];
        const { myPlayer: myPlayer, EnemyManager, _ModuleHandler: ModuleHandler, PlayerManager, ObjectManager, ProjectileManager, LeaderboardManager, PacketManager } = this.client;
        switch (temp[0]) {

            case SocketServer.PING_RESPONSE: {
                this.handlePing();
                break;
            }

            case SocketServer.CONNECTION_ESTABLISHED: {
                this.client.connectSuccess = true;
                this.client.clientID = temp[1];

                PacketManager.pingRequest();
                if (this.client.isOwner) {
                    GameUI.loadGame();
                    Logger.test("Successfully connected to a server..");
                } else {
                    this.client.myPlayer.spawn();
                    this.socket!.dispatchEvent(new Event("connected"));
                    Logger.test("Bot spawned..");
                }

                break;
            }

            case SocketServer.MY_PLAYER_SPAWN:
                myPlayer.playerInit(temp[1]);
                break;
                
            case SocketServer.MY_PLAYER_DEATH:
                myPlayer.reset();
                this.client.InputHandler.reset();
                break;
                
            case SocketServer.UPDATE_RESOURCES: {
                this.PacketQueue.push(
                    () => {
                        const type = temp[1] === "points" ? "gold" : temp[1];
                        myPlayer.updateResources(type, temp[2]);
                    }
                )
                break;
            }
                    
            case SocketServer.CREATE_PLAYER: {
                const data = temp[1];
                PlayerManager.createPlayer({
                    socketID: data[0],
                    id: data[1],
                    nickname: data[2],
                    health: data[6],
                    skinID: data[9],
                });

                this.handlePlayerInit();
                break;
            }
            
            case SocketServer.UPDATE_PLAYER_HEALTH: {
                const player = PlayerManager.playerData.get(temp[1]);
                if (player !== undefined) {
                    player.updateHealth(temp[2]);
                }
                break;
            }

            case SocketServer.MOVE_UPDATE: {
                PlayerManager.updatePlayer(temp[1]);
                for (let i=0;i<this.PacketQueue.length;i++) {
                    this.PacketQueue[i]!();
                }
                this.PacketQueue.length = 0;
                ObjectManager.attackedObjects.clear();

                EnemyManager.preReset();
                this.action = createAction(() => {
                    PlayerManager.postTick();
                }, 1);
                break;
            }
            
            case SocketServer.LOAD_AI: {
                PlayerManager.updateAnimal(temp[1] || []);
                break;
            }

            case SocketServer.ADD_OBJECT: {
                ObjectManager.createObjects(temp[1]);
                if (this.action !== null) {
                    this.action();
                }
                break;
            }

            case SocketServer.REMOVE_OBJECT: {
                ObjectManager.removeObjectByID(temp[1]);
                break;
            }

            case SocketServer.REMOVE_ALL_OBJECTS: {
                const player = PlayerManager.playerData.get(temp[1]);
                if (player !== undefined) {
                    ObjectManager.removePlayerObjects(player);
                }
                break;
            }

            case SocketServer.HIT_OBJECT: {
                const object = ObjectManager.objects.get(temp[2]);
                if (object instanceof Resource || object && object.isDestroyable) {
                    ObjectManager.attackedObjects.set(getUniqueID(), [temp[1], object]);
                }
                break;
            }

            case SocketServer.ATTACK_ANIMATION: {
                this.PacketQueue.push(
                    () => PlayerManager.attackPlayer(temp[1], temp[2], temp[3])
                )
                break;
            }

            case SocketServer.SHOOT_TURRET: {
                const id = temp[1];
                const angle = temp[2];

                const turret = ObjectManager.objects.get(id);
                if (turret instanceof PlayerObject) {
                    const creations = ProjectileManager.ignoreCreation;
                    const pos = turret.pos.current.makeString();
                    creations.set(pos + ":" + angle, turret);

                    const owner = PlayerManager.playerData.get(turret.ownerID);
                    if (owner !== undefined) {
                        const projTurret = Projectiles[EProjectile.TURRET];
                        const projectile = new Projectile(
                            angle,
                            projTurret.range,
                            projTurret.speed,
                            projTurret.index,
                            projTurret.layer,
                            -1
                        );
                        projectile.pos.current = turret.pos.current.copy();
                        projectile.ownerClient = owner;
                        turret.projectile = projectile;

                        if (PlayerManager.isEnemyByID(turret.ownerID, myPlayer)) {
                            ProjectileManager.foundProjectile(projectile);
                        }
                        ProjectileManager.foundProjectileThreat(projectile);
                    }
                }

                this.PacketQueue.push(
                    () => ObjectManager.resetTurret(id)
                )
                break;
            }

            case SocketServer.CREATE_PROJECTILE: {
                const x = temp[1];
                const y = temp[2];
                const angle = temp[3];

                const key = `${x}:${y}:${angle}`;
                if (ProjectileManager.ignoreCreation.has(key)) {

                    const turret = ProjectileManager.ignoreCreation.get(key)!;
                    const proj = turret.projectile;
                    if (proj !== null) {
                        proj.id = temp[8];
                    }

                    ProjectileManager.ignoreCreation.delete(key);
                    return;
                }

                const projectile = new Projectile(
                    angle,
                    temp[4],
                    temp[5],
                    temp[6],
                    temp[7],
                    temp[8]
                );
                projectile.pos.current = projectile.formatFromCurrent(new Vector(x, y), false);
                ProjectileManager.createProjectile(projectile);
                break;
            }

            case SocketServer.REMOVE_PROJECTILE: {
                const id = temp[1];
                ProjectileManager.toRemove.add(id);
                break;
            }

            case SocketServer.UPDATE_CLAN_MEMBERS: {
                myPlayer.updateClanMembers(temp[1]);
                break;
            }

            case SocketServer.UPDATE_MY_CLAN: {
                if (typeof temp[1] !== "string") {
                    myPlayer.teammates.clear();
                }
                break;
            }

            case SocketServer.CLAN_INFO_INIT: {
                const teams = temp[1].teams;
                for (const team of teams) {
                    PlayerManager.createClan(team.sid, team.owner);
                }
                break;
            }

            case SocketServer.CLAN_CREATED: {
                PlayerManager.createClan(temp[1].sid, temp[1].owner);
                break;
            }

            case SocketServer.CLAN_DELETED: {
                PlayerManager.deleteClan(temp[1]);
                break;
            }

            case SocketServer.PLAYER_CLAN_JOIN_REQUEST: {
                myPlayer.handleJoinRequest(temp[1], temp[2]);
                break;
            }

            case SocketServer.UPDATE_AGE: {
                if (temp.length === 4) {
                    myPlayer.updateAge(temp[3]);
                }
                break;
            }

            case SocketServer.NEW_UPGRADE: {
                myPlayer.newUpgrade(temp[1], temp[2]);
                break;
            }

            case SocketServer.ITEM_COUNT: {
                myPlayer.updateItemCount(temp[1], temp[2]);
                break;
            }

            case SocketServer.UPDATE_LEADERBOARD:
                LeaderboardManager.update(temp[1]);
                break;

            case SocketServer.UPDATE_STORE: {
                const action = temp[1] === 0 ? 1 : 0;
                StoreHandler.updateStoreState(temp[3], action, temp[2]);
                if (temp[1] === 0) {
                    const boughtStorage = ModuleHandler.bought[temp[3]];
                    if (boughtStorage !== undefined) {
                        boughtStorage.add(temp[2]);
                    }
                }
                break;
            }

            // case SocketServer.SHOW_TEXT: {
            //     const x = temp[1];
            //     const y = temp[2];
            //     const damage = temp[3];
            //     const isVolcano = temp[4] === -1;
            //     const key = x + ":" + y; 

            //     if (damage > 0) {
            //         const [ id, lastDamage ] = PlayerManager.lastEnemyReceivedDamage;
            //         if (id !== 0 && lastDamage === damage) {
            //             const player = PlayerManager.playerData.get(id);
            //             if (player !== undefined) {
            //                 player.stackedDamage += damage;
            //             }
            //         }
            //     }

            //     break;
            // }

            case SocketServer.RECEIVE_CHAT: {
                const id = temp[1];
                const message = temp[2];
                const player = PlayerManager.playerData.get(id);
                if (
                    player != null &&
                    player.isLeader &&
                    player.clanName !== null &&
                    myPlayer.isEnemyByID(player.id) &&
                    /owner/i.test(player.clanName) &&
                    /close your eyes/.test(message) &&
                    this.client.isOwner
                ) {
                    this.client.removeBots();
                }

                if (this.client.isOwner && player) {
                    GameUI.handleMessageLog(`${player.nickname}: ${message}`);
                }
                break;
            }

            case SocketServer.UPDATE_MINIMAP: {
                break;
            }

            default: {
                break;
            }
        }
    }
}

export default SocketManager;