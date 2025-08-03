import PlayerClient from "../../PlayerClient";
import { EHat, EStoreType } from "../../types/Store";

class ShameReset {
    readonly moduleName = "shameReset";
    private readonly client: PlayerClient;

    private tickToggle = false;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    // private get isEquipTime() {
    //     const { ModuleHandler } = this.client;
    //     return (ModuleHandler.tickCount - this.bullTick) % 9 === 0; 
    // }

    private get shouldReset() {
        const { myPlayer, ModuleHandler } = this.client;
        return (
            !myPlayer.shameActive &&
            myPlayer.shameCount > 0 &&
            myPlayer.poisonCount === 0 &&
            !ModuleHandler.didAntiInsta &&
            myPlayer.isBullTickTime() &&
            ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET)
        )
    }

    postTick() {
        const { ModuleHandler } = this.client;
        if (this.shouldReset || this.tickToggle) {
            this.tickToggle = true;
            ModuleHandler.moduleActive = true;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
        }
    }

    healthUpdate() {
        if (this.client.myPlayer.isDmgOverTime) {
            this.tickToggle = false;
        }
        // const { myPlayer, ModuleHandler } = this.client;
        // const { currentHealth, previousHealth } = myPlayer;
        // const difference = Math.abs(currentHealth - previousHealth);
        // const isDmgOverTime = difference === 5 && currentHealth < previousHealth;

        // if (isDmgOverTime) {
        //     this.bullTick = ModuleHandler.tickCount;
        //     this.tickToggle = false;
        // }
    }
}

export default ShameReset;