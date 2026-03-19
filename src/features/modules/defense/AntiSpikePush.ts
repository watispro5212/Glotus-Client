import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AntiSpikePush {
    readonly moduleName = "antiSpikePush";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer, EnemyManager } = this.client;
        if (!settings._antiSpikePush || ModuleHandler.moduleActive) return;

        // MAKE SURE WE ARE ABOUT TO COLLIDE SPIKE
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (
            nearestEnemy === null ||
            !myPlayer.isTrapped ||
            !EnemyManager.pushingOnSpike ||
            EnemyManager.collidingSpike ||
            nearestEnemy.isTrapped
        ) return;

        // MAKE SURE WE ONLY HAVE SPECIAL WEAPONS
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isDaggers = primary === EWeapon.DAGGERS || primary === EWeapon.BAT;
        if (!isDaggers) return;

        // MAKE SURE WE CAN ACTUALLY HIT ENEMY
        const primaryRange = DataHandler.getWeapon(primary).range + nearestEnemy.hitScale;
        if (!myPlayer.collidingSimple(nearestEnemy, primaryRange)) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        const { reloading } = ModuleHandler.staticModules;
        const primaryReloaded = reloading.isReloaded(WeaponType.PRIMARY);
        const turretReloaded = ModuleHandler.hasStoreItem(EStoreType.HAT, EHat.TURRET_GEAR) && reloading.isReloaded(ReloadType.TURRET);

        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        if (primaryReloaded) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            if (turretReloaded) {
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            ModuleHandler.shouldAttack = true;
        }
    }
}