import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";

class ShameReset {
    readonly moduleName = "shameReset";
    private readonly client: PlayerClient;

    private tickToggle = false;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    isBullTickTime() {
        const { myPlayer } = this.client;
        return (
            !myPlayer.shameActive &&
            myPlayer.shameCount > 0 &&
            myPlayer.poisonCount === 0 &&
            myPlayer.isBullTickTime()
        )
    }

    private get shouldReset() {
        const { ModuleHandler } = this.client;
        return (
            this.isBullTickTime() &&
            ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET)
        )
    }

    private notSave() {
        const { EnemyManager, myPlayer, ModuleHandler } = this.client;
        return (
            ModuleHandler.forceHat === EHat.TANK_GEAR ||
            EnemyManager.instaThreat() ||
            EnemyManager.collidingSpike ||
            myPlayer.wasTrapped() ||
            ModuleHandler.currentType === ItemType.FOOD
        )
    }

    postTick() {
        const { ModuleHandler } = this.client;
        if (!this.notSave() && (this.shouldReset || this.tickToggle)) {
            this.tickToggle = true;
            ModuleHandler.moduleActive = true;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
        }
    }

    healthUpdate() {
        if (this.client.myPlayer.isDmgOverTime) {
            this.tickToggle = false;
        }
    }
}

export default ShameReset;