import type PlayerClient from "../../../PlayerClient";
import { EAccessory, EHat, EStoreType } from "../../../types/Store";

export default class AutoBuy {
    readonly moduleName = "autoBuy";
    private readonly client: PlayerClient;

    private buyIndex = 0;
    private readonly buyList = [
        [EStoreType.ACCESSORY, EAccessory.MONKEY_TAIL],
        [EStoreType.HAT, EHat.BOOSTER_HAT],
        [EStoreType.HAT, EHat.BULL_HELMET],
        [EStoreType.HAT, EHat.SOLDIER_HELMET],
        [EStoreType.HAT, EHat.TANK_GEAR],
        [EStoreType.HAT, EHat.TURRET_GEAR],
        [EStoreType.ACCESSORY, EAccessory.CORRUPT_X_WINGS],
        [EStoreType.HAT, EHat.SPIKE_GEAR],
        [EStoreType.ACCESSORY, EAccessory.SHADOW_WINGS],
        [EStoreType.HAT, EHat.WINTER_CAP],
        [EStoreType.HAT, EHat.FLIPPER_HAT],
        [EStoreType.HAT, EHat.SAMURAI_ARMOR],
        [EStoreType.HAT, EHat.EMP_HELMET],
    ] as const;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    boughtEverything() {
        return this.buyIndex >= this.buyList.length;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        if (this.boughtEverything() || !myPlayer.isSandbox) return;

        const [ type, id ] = this.buyList[this.buyIndex]!;
        if (ModuleHandler.canBuy(type, id)) {
            ModuleHandler._buy(type, id);
        }

        if (ModuleHandler.bought[type].has(id)) {
            this.buyIndex += 1;
        }
    }
}