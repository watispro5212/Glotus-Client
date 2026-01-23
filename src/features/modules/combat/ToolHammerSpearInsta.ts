import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class ToolHammerSpearInsta {
    readonly moduleName = "toolHammerSpearInsta";
    private readonly client: PlayerClient;

    private nearestTarget: Player | null = null;
    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { ModuleHandler, myPlayer, EnemyManager } = this.client;
        if (ModuleHandler.moduleActive || !settings._toolSpearInsta) {
            this.nearestTarget = null;
            return;
        }

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (
            nearestEnemy === null ||
            !ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET)
        ) return;

        // HANDLE TURRET EQUIPMENT ON THE END
        if (this.useTurret) {
            if (ModuleHandler.canBuy(EStoreType.HAT, EHat.TURRET_GEAR)) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            this.useTurret = false;
            return;
        }

        if (myPlayer.upgradeAge !== 2) return;

        // HANDLE ATTACK WITH POLEARM
        const pos1 = myPlayer.pos.current;
        if (this.nearestTarget !== null) {
            const pos2 = this.nearestTarget.pos.current;
            const angle = pos1.angle(pos2);

            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            ModuleHandler.upgradeItem(EWeapon.POLEARM);
            this.nearestTarget = null;
            this.useTurret = true;

            EnemyManager.attemptSpikePlacement();
            return;
        }

        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);
        const { reloading } = ModuleHandler.staticModules;
        const primaryReloaded = reloading.isReloaded(WeaponType.PRIMARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        const range = DataHandler.getWeapon(EWeapon.TOOL_HAMMER).range + nearestEnemy.hitScale;
        if (
            !primaryReloaded ||
            !turretReloaded ||
            !myPlayer.collidingSimple(nearestEnemy, range)
        ) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.BULL_HELMET;
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
        this.nearestTarget = nearestEnemy;
    }
}