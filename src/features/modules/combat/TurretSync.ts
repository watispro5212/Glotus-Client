import type PlayerClient from "../../../PlayerClient";
import { WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class TurretSync {
    readonly moduleName = "turretSync";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._turretSync) return;

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null) return;

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const weapon = DataHandler.getWeapon(primary);
        if (weapon.damage < 20) return;

        const range = weapon.range + nearestEnemy.hitScale;
        const { reloading } = ModuleHandler.staticModules;
        if (
            !myPlayer.collidingSimple(nearestEnemy, range) ||
            !reloading.isReloaded(WeaponType.PRIMARY) ||
            nearestEnemy.nextDamageTick !== myPlayer.tickCount + 2
        ) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);
        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.BULL_HELMET;
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
    }
}