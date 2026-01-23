import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EItem, EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";

export default class SwordKatanaInsta {
    readonly moduleName = "swordKatanaInsta";
    private readonly client: PlayerClient;

    private nearestTarget: Player | null = null;
    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { myPlayer, ModuleHandler, EnemyManager } = this.client;
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (ModuleHandler.moduleActive || !nearestEnemy) {
            this.nearestTarget = null;
            this.useTurret = false;
            return;
        }

        const { reloading } = ModuleHandler.staticModules;
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        if (this.useTurret) {
            this.useTurret = false;
            if (turretReloaded && ModuleHandler.canBuy(EStoreType.HAT, EHat.TURRET_GEAR)) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            return;
        }

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isSword = primary === EWeapon.SHORT_SWORD;
        const pos1 = myPlayer.pos.current;
        const target = this.nearestTarget;

        if (target !== null) {
            const pos2 = target.pos.current;
            const angle = pos1.angle(pos2);

            ModuleHandler.useAngle = angle;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            if (myPlayer.upgradeAge === 3) ModuleHandler.upgradeItem(EItem.COOKIE, true);
            if (myPlayer.upgradeAge === 4) ModuleHandler.upgradeItem(EItem.PIT_TRAP, true);
            if (myPlayer.upgradeAge === 5) ModuleHandler.upgradeItem(EItem.GREATER_SPIKES, true);
            if (myPlayer.upgradeAge === 6) ModuleHandler.upgradeItem(EWeapon.GREAT_HAMMER);
            if (myPlayer.upgradeAge === 7) ModuleHandler.upgradeItem(EItem.TELEPORTER, true);
            if (myPlayer.upgradeAge === 8) ModuleHandler.upgradeItem(EWeapon.KATANA);
            this.nearestTarget = null;
            if (ModuleHandler.canBuy(EStoreType.HAT, EHat.TURRET_GEAR)) {
                this.useTurret = true;
            }
            EnemyManager.attemptSpikePlacement();
        }

        if (
            myPlayer.age < 8 ||
            !isSword ||
            !primaryReloaded ||
            !ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET)
        ) return;

        const range = DataHandler.getWeapon(primary).range + nearestEnemy.hitScale;
        if (!myPlayer.collidingSimple(nearestEnemy, range)) return;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.BULL_HELMET;
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
        this.nearestTarget = nearestEnemy;
    }
}