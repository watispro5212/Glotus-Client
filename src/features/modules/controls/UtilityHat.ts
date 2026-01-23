import type PlayerClient from "../../../PlayerClient";
import { EAttack } from "../../../types/Enums";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";

export default class UtilityHat {
    readonly moduleName = "utilityHat";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getBestUtilityHat(weaponType: WeaponType) {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        const id = myPlayer.getItemByType(weaponType)!;
        if (id === EWeapon.WOODEN_SHIELD) return null;
        if (DataHandler.isShootable(id)) {
            ModuleHandler.canHitEntity = true;
            return EHat.SAMURAI_ARMOR;
        }

        const weapon = DataHandler.getWeapon(id);
        const range = weapon.range;

        if (weapon.damage <= 1) return null;
        
        if (ModuleHandler.attackingState === EAttack.ATTACK) {
            const nearest = EnemyManager.nearestEntity;
            if (
                nearest !== null &&
                myPlayer.collidingEntity(nearest, range + nearest.hitScale)
            ) {
                ModuleHandler.canHitEntity = true;
                return EHat.BULL_HELMET;
            }
        }

        if (ModuleHandler.attackingState !== EAttack.DISABLED) {
            const nearestObject = EnemyManager.nearestPlayerObject;
            if (nearestObject === null) return null;

            if (myPlayer.colliding(nearestObject, range + nearestObject.hitScale)) {
                return EHat.TANK_GEAR;
            }
        }

        return null;
    }

    postTick() {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (ModuleHandler.moduleActive) return;
        
        const { forceWeapon, useWeapon, weapon } = ModuleHandler;
        const weaponType = forceWeapon !== null ? forceWeapon : useWeapon !== null ? useWeapon : weapon;
        let hat = this.getBestUtilityHat(weaponType);
        const { reloading } = ModuleHandler.staticModules;
        const isReloaded = reloading.isReloaded(weaponType);
        const isEmptyReload = reloading.isEmptyReload(weaponType);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        if (!isReloaded) {
            hat = null;
        }

        if (ModuleHandler.canHitEntity && isEmptyReload && turretReloaded) {
            const nearest = EnemyManager.nearestEntity;
            if (nearest !== null && myPlayer.collidingEntity(nearest, 700)) {
                hat = EHat.TURRET_GEAR;
            }
        }

        if (hat !== null) {
            ModuleHandler.useHat = hat;
        }
    }
}