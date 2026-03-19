import type PlayerClient from "../../../PlayerClient";
import { WeaponType } from "../../../types/Items";

class PreAttack {
    readonly moduleName = "preAttack";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private isReloadedByType(type: WeaponType | null) {
        const { weapon, staticModules } = this.client._ModuleHandler;
        const weaponType = type !== null ? type : weapon;
        return staticModules.reloading.isReloaded(weaponType);
    }

    postTick(): void {
        
        const { _ModuleHandler: ModuleHandler } = this.client;
        const { useWeapon, weapon, forceWeapon } = ModuleHandler;

        const nextWeapon = forceWeapon !== null ? forceWeapon : useWeapon;
        const forceReloaded = this.isReloadedByType(nextWeapon);
        const canAttack = ModuleHandler.shouldAttack && (forceReloaded && this.isReloadedByType(weapon) || forceWeapon !== null && forceReloaded);
        ModuleHandler.shouldAttack = canAttack;
    }
}

export default PreAttack;