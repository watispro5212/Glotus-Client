import EnemyManager from "./Managers/EnemyManager";
import LeaderboardManager from "./Managers/LeaderboardManager";
import ObjectManager from "./Managers/ObjectManager";
import PacketManager from "./Managers/PacketManager";
import PlayerManager from "./Managers/PlayerManager";
import ProjectileManager from "./Managers/ProjectileManager";
import SocketManager from "./Managers/SocketManager";
import StatsManager from "./Managers/StatsManager";
import ClientPlayer from "./data/ClientPlayer";
import InputHandler from "./features/InputHandler";
import ModuleHandler from "./features/ModuleHandler";

class PlayerClient {
    id = -1;
    connectSuccess = false;
    clientID: string | null = null;
    readonly owner: PlayerClient;
    readonly SocketManager: SocketManager;
    readonly ObjectManager: ObjectManager;
    readonly PlayerManager: PlayerManager;
    readonly ProjectileManager: ProjectileManager;
    readonly LeaderboardManager: LeaderboardManager;
    readonly EnemyManager: EnemyManager;
    readonly ModuleHandler: ModuleHandler;
    readonly myPlayer: ClientPlayer;
    readonly PacketManager: PacketManager;
    readonly InputHandler: InputHandler;
    readonly StatsManager: StatsManager;

    readonly pendingJoins = new Set<number>();
    readonly clientIDList = new Set<number>();
    readonly clients = new Set<PlayerClient>();

    constructor(owner?: PlayerClient) {
        this.owner = owner || this;
        this.SocketManager = new SocketManager(this);
        this.ObjectManager = new ObjectManager(this);
        this.PlayerManager = new PlayerManager(this);
        this.ProjectileManager = new ProjectileManager(this);
        this.LeaderboardManager = new LeaderboardManager(this);
        this.EnemyManager = new EnemyManager(this);
        this.ModuleHandler = new ModuleHandler(this);
        this.myPlayer = new ClientPlayer(this);
        this.PacketManager = new PacketManager(this);
        this.InputHandler = new InputHandler(this);
        this.StatsManager = new StatsManager(this);
    }

    getClientIndex(client: PlayerClient) {
        return [...this.clients].indexOf(client);
    }

    get isOwner() {
        return this.owner === this;
    }

    isBotByID(id: number) {
        return this.clientIDList.has(id);
    }

    disconnect() {
        const socket = this.SocketManager.socket;
        if (socket !== null) {
            socket.close();
        }
    }

    removeBots() {
        for (const client of this.clients) {
            client.disconnect();
        }
    }

    spawn() {
        this.myPlayer.spawn();
    }
}

export default PlayerClient;