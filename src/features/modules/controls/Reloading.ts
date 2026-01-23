import PlayerClient from "../../../PlayerClient";
import { type IReload } from "../../../types/Common";
import { ReloadType, WeaponType } from "../../../types/Items";

class Reloading {
    readonly moduleName = "reloading";
    private readonly client: PlayerClient;
    private readonly clientReload = [{}, {}, {}] as [IReload, IReload, IReload];

    constructor(client: PlayerClient) {
        this.client = client;
        this.reset();
    }

    reset() {
        const [ primary, secondary, turret ] = this.clientReload;
        primary.current = primary.max = 0;
        secondary.current = secondary.max = 0;
        turret.current = turret.max = 23;
    }

    get currentReload() {
        return this.clientReload[this.client.ModuleHandler.weapon];
    }

    getReload(type: WeaponType | ReloadType) {
        return this.clientReload[type];
    }

    updateMaxReload(type: WeaponType) {
        const { myPlayer, ModuleHandler, SocketManager } = this.client;
        const reload = this.getReload(type);
        const id = myPlayer.getItemByType(type)!;
        const store = ModuleHandler.getHatStore();
        const pingAccount = Math.floor(SocketManager.pong / SocketManager.TICK);
        const speed = myPlayer.getWeaponSpeed(id, store.last) - pingAccount;
        reload.current = speed;
        reload.max = speed;
    }

    resetReload(reload: IReload) {
        reload.current = -1;
    }

    resetByType(type: WeaponType | ReloadType) {
        this.resetReload(this.getReload(type));
    }

    isReloaded(type: WeaponType | ReloadType, ticks = 0) {
        const reload = this.clientReload[type];
        return reload.current >= (reload.max - ticks);
    }

    isFasterThan(type1: WeaponType, type2: WeaponType) {
        const reload1 = this.clientReload[type1];
        const reload2 = this.clientReload[type2];
        const data1 = reload1.max - reload1.current;
        const data2 = reload2.max - reload2.current;
        return Math.abs(data1) <= Math.abs(data2);
    }

    isEmptyReload(type: WeaponType | ReloadType) {
        const reload = this.clientReload[type];
        return reload.current === 0;
    }

    postTick(): void {
        
        const { myPlayer } = this.client;

        const primaryReload = myPlayer.reload[ReloadType.PRIMARY].current;
        const secondaryReload = myPlayer.reload[ReloadType.SECONDARY].current;
        if (primaryReload !== -1) {
            this.clientReload[ReloadType.PRIMARY].current = primaryReload;
        }
        if (secondaryReload !== -1) {
            this.clientReload[ReloadType.SECONDARY].current = secondaryReload;
        }
        this.clientReload[ReloadType.TURRET].current = myPlayer.reload[ReloadType.TURRET].current;
    }
}

export default Reloading;