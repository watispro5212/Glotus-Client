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
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = this.client;
        const { reloading } = ModuleHandler.staticModules;

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const isMelee1 = DataHandler.isMelee(primary);
        const isMelee2 = DataHandler.isMelee(secondary);
        return (
            isMelee1 && primary === EWeapon.STICK ||
            isMelee1 && !reloading.isReloaded(WeaponType.PRIMARY, 3) ||
            isMelee2 && !reloading.isReloaded(WeaponType.SECONDARY, 3)
        );
    }

    private getBestCurrentAcc() {
        const { _ModuleHandler: ModuleHandler, EnemyManager } = this.client;
        const { actual } = ModuleHandler.getAccStore();

        const useCorrupt = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.CORRUPT_X_WINGS);
        const useShadow = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.SHADOW_WINGS);
        const useTail = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.MONKEY_TAIL);
        const useActual = ModuleHandler.canBuy(EStoreType.ACCESSORY, actual);

        if (settings._tailPriority && useTail && this.shouldUseTail()) return EAccessory.MONKEY_TAIL;
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
        const { _ModuleHandler: ModuleHandler } = this.client;
        const acc = this.getBestCurrentAcc();
        ModuleHandler.useAcc = acc;
    }
}