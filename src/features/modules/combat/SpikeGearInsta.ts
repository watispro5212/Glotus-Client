import type PlayerClient from "../../../PlayerClient";
import { ReloadType, WeaponType, WeaponVariant } from "../../../types/Items";
import { EAccessory, EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class SpikeGearInsta {
    readonly moduleName = "spikeGearInsta";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || EnemyManager.instaThreat() || EnemyManager.spikeSyncThreat || !settings._spikeGearInsta) {
            return;
        }

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (
            nearestEnemy === null ||
            !ModuleHandler.canBuy(EStoreType.HAT, EHat.SPIKE_GEAR) ||
            !ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.CORRUPT_X_WINGS) ||
            myPlayer.accessoryID !== EAccessory.CORRUPT_X_WINGS ||
            nearestEnemy.variant.primary !== WeaponVariant.STONE
        ) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        const primary1 = myPlayer.getItemByType(WeaponType.PRIMARY);
        const primary2 = nearestEnemy.weapon.primary;
        if (primary2 === null) return;

        const range1 = DataHandler.getWeapon(primary1).range + nearestEnemy.hitScale;
        const range2 = DataHandler.getWeapon(primary2).range + myPlayer.hitScale;
        if (
            !myPlayer.collidingSimple(nearestEnemy, range1) ||
            !nearestEnemy.collidingSimple(myPlayer, range2)
        ) return;

        // const primaryDamage1 = myPlayer.getMaxWeaponDamage(primary1, false, true);
        // const primaryDamage2 = nearestEnemy.getMaxWeaponDamage(primary2, false, true);
        // const damage = primaryDamage1 * (nearestEnemy.hatID === EHat.SOLDIER_HELMET ? 0.75 : 1) + (primaryDamage2 * 0.7);
        // const isEnoughToKill = damage >= nearestEnemy.currentHealth;
        // if (!isEnoughToKill) return;

        ModuleHandler.forceHat = EHat.SPIKE_GEAR;
        if (
            nearestEnemy.hatID !== EHat.BULL_HELMET ||
            !nearestEnemy.isEmptyReload(ReloadType.PRIMARY) ||
            myPlayer.hatID !== EHat.SPIKE_GEAR
        ) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.BULL_HELMET;
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
    }
}