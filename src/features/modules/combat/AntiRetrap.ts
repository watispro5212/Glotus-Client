import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AntiRetrap {
    readonly moduleName = "antiRetrap";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._antiRetrap) return;

        const { reloading } = ModuleHandler.staticModules;
        const nearestTrap = EnemyManager.nearestTrap;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isReloadedPrimary = reloading.isReloaded(WeaponType.PRIMARY);

        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const isHammer = secondary === EWeapon.GREAT_HAMMER;
        const isReloadedSecondary = reloading.isReloaded(WeaponType.SECONDARY);
        const damage = myPlayer.getBuildingDamage(EWeapon.GREAT_HAMMER, true);
        const turretReloaded = ModuleHandler.hasStoreItem(EStoreType.HAT, EHat.TURRET_GEAR) && reloading.isReloaded(ReloadType.TURRET);

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (
            nearestEnemy === null ||
            nearestTrap === null ||
            nearestTrap.health > damage ||
            !isHammer ||
            !isReloadedSecondary
        ) return;

        const range = DataHandler.getWeapon(primary).range + nearestEnemy.hitScale;
        if (!myPlayer.collidingEntity(nearestEnemy, range)) return;
        
        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        if (isReloadedPrimary) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.useAngle = angle;
            ModuleHandler.shouldAttack = true;
            if (turretReloaded) {
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
        }
    }
}