import { Resource } from "../data/ObjectItem";
import Projectile from "../data/Projectile";
import GameUI from "../UI/GameUI";
import { SocketServer } from "../types/Socket";
import { getUniqueID } from "../utility/Common";
import Vector from "../modules/Vector";
import PlayerClient from "../PlayerClient";
import StoreHandler from "../UI/StoreHandler";

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
    tickTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    init(socket: WebSocket) {
        this.socket = socket;
        this.socketSend = socket.send.bind(socket);
        socket.addEventListener("message", (event) => this.handleMessage(event));
        
        // const that = this;
        // const _send = socket.send;
        // socket.send = function(data: Uint8Array) {
        //     const decoder = that.client.PacketManager.Decoder;
        //     if (decoder === null) return;
        //     const decoded = decoder.decode(new Uint8Array(data));
        //     const temp = [decoded[0], ...decoded[1]];
        //     switch (temp[0]) {
        //         case SocketClient.SPAWN: {
        //             const name = ":D " + temp[1].name;
        //             that.client.PacketManager.spawn(name.trim(), 1, Storage.get("skin_color"));
        //             return;
        //         }
        //     }
        //     return _send.call(this, data);
        // }
    }

    private handlePing() {
        this.pong = Math.round(performance.now() - this.startPing);
        
        if (this.client.isOwner) {
            GameUI.updatePing(this.pong);
        }

        setTimeout(() => {
            this.client.PacketManager.pingRequest();
        }, 3000);
    }

    private handleMessage(event: MessageEvent<ArrayBuffer>) {
        const decoder = this.client.PacketManager.Decoder;
        if (decoder === null) return;
        
        const data = event.data;
        const decoded = decoder.decode(new Uint8Array(data));
        const temp = [decoded[0], ...decoded[1]];
        const { myPlayer, ModuleHandler, PlayerManager, ObjectManager, ProjectileManager, LeaderboardManager, PacketManager } = this.client;
        switch (temp[0]) {

            case SocketServer.PING_RESPONSE: {
                this.handlePing();
                break;
            }

            case SocketServer.CONNECTION_ESTABLISHED: {
                this.client.connectSuccess = true;
                
                PacketManager.pingRequest();
                if (this.client.isOwner) {
                    GameUI.loadGame();
                } else {
                    this.client.myPlayer.spawn();
                    this.socket!.dispatchEvent(new Event("connected"));
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
                break;
            }
            
            case SocketServer.LOAD_AI: {
                PlayerManager.updateAnimal(temp[1] || []);
                clearTimeout(this.tickTimeout);
                this.tickTimeout = setTimeout(() => {
                    PlayerManager.postTick();
                }, 5);
                break;
            }

            case SocketServer.ADD_OBJECT: {
                ObjectManager.createObjects(temp[1]);
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
                if (turret !== undefined) {
                    const creations = ProjectileManager.ignoreCreation;
                    const pos = turret.pos.current.makeString();
                    creations.add(pos + ":" + angle);
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
                if (ProjectileManager.ignoreCreation.delete(key)) {
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

            // case SocketServer.REMOVE_PROJECTILE: {
            //     console.log(temp);
            //     break;
            // }

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

            default: {
                break;
            }
        }
    }
}

export default SocketManager;