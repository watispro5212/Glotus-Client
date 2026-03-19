import type PlayerClient from "../../../PlayerClient";
import type { EItem, EWeapon } from "../../../types/Items";
import { EAccessory, EHat, EStoreType } from "../../../types/Store";

class Autohat {
    readonly moduleName = "autoHat";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private handleEquip(type: EStoreType, use: number | null): boolean {
        const { _ModuleHandler: ModuleHandler } = this.client;
        if (type === EStoreType.HAT && ModuleHandler.forceHat !== null) {
            use = ModuleHandler.forceHat;
        }
        if (use !== null && ModuleHandler._equip(type, use)) {
            return true;
        }
        return false;
    }

    getNextHat(): EHat {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.forceHat !== null) return ModuleHandler.forceHat;
        if (ModuleHandler.useHat !== null) return ModuleHandler.useHat;
        return myPlayer.hatID;
    }

    getNextAcc(): EAccessory {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.useAcc !== null) return ModuleHandler.useAcc;
        return myPlayer.accessoryID;
    }

    getNextWeaponID(): EWeapon {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.forceWeapon !== null) return myPlayer.getItemByType(ModuleHandler.forceWeapon)!;
        if (ModuleHandler.useWeapon !== null) return myPlayer.getItemByType(ModuleHandler.useWeapon)!;
        return myPlayer.weapon.current;
    }

    getNextItemID(): EItem | -1 {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.useItem !== null) return myPlayer.getItemByType(ModuleHandler.useItem)!;
        return myPlayer.currentItem;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler } = this.client;
        if (!ModuleHandler.sentHatEquip) {
            this.handleEquip(EStoreType.HAT, ModuleHandler.useHat);
        }
        
        if (!ModuleHandler.sentAccEquip && !ModuleHandler.sentHatEquip) {
            this.handleEquip(EStoreType.ACCESSORY, ModuleHandler.useAcc);
        }
    }
}

export default Autohat;