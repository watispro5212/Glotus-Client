import type PlayerClient from "../../../PlayerClient";
import { EStoreType } from "../../../types/Store";

class Autohat {
    readonly moduleName = "autoHat";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private handleEquip(type: EStoreType, use: number | null): boolean {
        const { ModuleHandler } = this.client;
        if (type === EStoreType.HAT && ModuleHandler.forceHat !== null) {
            use = ModuleHandler.forceHat;
        }
        if (use !== null && ModuleHandler.equip(type, use)) {
            return true;
        }
        return false;
    }

    postTick() {
        const { ModuleHandler } = this.client;
        if (!ModuleHandler.sentHatEquip) {
            this.handleEquip(EStoreType.HAT, ModuleHandler.useHat);
        }
        
        if (!ModuleHandler.sentAccEquip && !ModuleHandler.sentHatEquip) {
            this.handleEquip(EStoreType.ACCESSORY, ModuleHandler.useAcc);
        }
    }
}

export default Autohat;