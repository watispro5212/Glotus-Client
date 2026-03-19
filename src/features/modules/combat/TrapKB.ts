import type PlayerClient from "../../../PlayerClient";
import { ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class TrapKB {
    readonly moduleName = "trapKB";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;

        const nearestEnemy = EnemyManager.nearestKBTrapEnemy;
        if (
            nearestEnemy === null ||
            nearestEnemy.isTrapped ||
            ModuleHandler.moduleActive ||
            EnemyManager.shouldIgnoreModule() ||
            !settings._trapKB
        ) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        const { reloading } = ModuleHandler.staticModules;
        const primaryReloaded = reloading.isReloaded(WeaponType.PRIMARY);
        // const secondaryReloaded = reloading.isReloaded(WeaponType.SECONDARY);
        const turretReloaded = ModuleHandler.hasStoreItem(EStoreType.HAT, EHat.TURRET_GEAR) && reloading.isReloaded(ReloadType.TURRET);
        if (!primaryReloaded) return;

        const range = DataHandler.getWeapon(myPlayer.getItemByType(WeaponType.PRIMARY)).range + nearestEnemy.hitScale;
        if (!myPlayer.collidingSimple(nearestEnemy, range)) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        if (turretReloaded) {
            ModuleHandler.forceHat = EHat.TURRET_GEAR;
        }
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
    }
}