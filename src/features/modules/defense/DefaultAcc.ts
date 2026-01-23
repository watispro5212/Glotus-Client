import type PlayerClient from "../../../PlayerClient";
import { EWeapon, WeaponType } from "../../../types/Items";
import { EAccessory, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class DefaultAcc {
    readonly moduleName = "defaultAcc";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private shouldUseTail() {
        const { ModuleHandler, myPlayer } = this.client;
        const { reloading } = ModuleHandler.staticModules;

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        return (
            DataHandler.isMelee(primary) && primary !== EWeapon.STICK && !reloading.isReloaded(WeaponType.PRIMARY, 2) ||
            DataHandler.isMelee(secondary) && !reloading.isReloaded(WeaponType.SECONDARY, 2)
        );
    }

    private getBestCurrentAcc() {
        const { ModuleHandler, EnemyManager } = this.client;
        const { actual } = ModuleHandler.getAccStore();

        const useCorrupt = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.CORRUPT_X_WINGS);
        const useShadow = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.SHADOW_WINGS);
        const useTail = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.MONKEY_TAIL);
        const useActual = ModuleHandler.canBuy(EStoreType.ACCESSORY, actual);

        // if (useTail && this.shouldUseTail()) return EAccessory.MONKEY_TAIL;
        if (EnemyManager.detectedEnemy || EnemyManager.nearestEnemyInRangeOf(300, EnemyManager.nearestEntity)) {
            const isEnemy = EnemyManager.nearestEntity === EnemyManager.nearestEnemy;
            if (isEnemy && useCorrupt && settings._antienemy) return EAccessory.CORRUPT_X_WINGS;
            if (useShadow) return EAccessory.SHADOW_WINGS;
            if (useActual && actual !== EAccessory.MONKEY_TAIL) return actual;
            return EAccessory.UNEQUIP;
        }
        // if (useCorrupt && ModuleHandler.detectedEnemy) return EAccessory.CORRUPT_X_WINGS;
        // // if (useCorrupt && EnemyManager.nearestMeleeReloaded !== null) return EAccessory.CORRUPT_X_WINGS;
        if (useTail) return EAccessory.MONKEY_TAIL;
        return EAccessory.UNEQUIP;
    }

    postTick() {
        const { ModuleHandler } = this.client;
        const acc = this.getBestCurrentAcc();
        ModuleHandler.useAcc = acc;
    }
}