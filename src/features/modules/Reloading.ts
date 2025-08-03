import PlayerClient from "../../PlayerClient";
import { type IReload } from "../../types/Common";
import { ReloadType, WeaponType } from "../../types/Items";

class Reloading {
    readonly moduleName = "reloading";
    private readonly client: PlayerClient;
    private readonly clientReload = [{}, {}, {}] as [IReload, IReload, IReload];

    constructor(client: PlayerClient) {
        this.client = client;

        const [ primary, secondary, turret ] = this.clientReload;
        primary.current = primary.max = 0;
        secondary.current = secondary.max = 0;
        turret.current = turret.max = 2500;
    }

    get currentReload() {
        return this.clientReload[this.client.ModuleHandler.weapon];
    }

    getReload(type: WeaponType | ReloadType) {
        return this.clientReload[type];
    }

    updateMaxReload(type: WeaponType) {
        const { myPlayer, ModuleHandler } = this.client;
        const reload = this.getReload(type);
        const id = myPlayer.getItemByType(type)!;
        const store = ModuleHandler.getHatStore();
        const speed = myPlayer.getWeaponSpeed(id, store.last);
        reload.current = speed;
        reload.max = speed;
    }

    resetReload(reload: IReload) {
        const { PlayerManager } = this.client;
        reload.current = -PlayerManager.step;
    }

    resetByType(type: WeaponType | ReloadType) {
        this.resetReload(this.getReload(type));
    }

    isReloaded(type: WeaponType | ReloadType, ticks = 0) {
        const reload = this.clientReload[type];
        return reload.current >= (reload.max - this.client.SocketManager.TICK * ticks);
    }

    private increaseReload(reload: IReload, step: number) {
        reload.current += step;
        if (reload.current > reload.max) {
            reload.current = reload.max;
        }
    }

    postTick(): void {
        
        const { ModuleHandler, PlayerManager } = this.client;

        this.increaseReload(this.clientReload[ReloadType.TURRET], PlayerManager.step);
        if (ModuleHandler.holdingWeapon) {
            this.increaseReload(this.currentReload, PlayerManager.step);
        }
    }
}

export default Reloading;