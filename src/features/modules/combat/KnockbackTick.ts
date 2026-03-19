import type PlayerClient from "../../../PlayerClient";
import { ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class KnockbackTick {
    readonly moduleName = "knockbackTick";
    private readonly client: PlayerClient;

    private useTurret = false;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._knockbackTick || EnemyManager.shouldIgnoreModule()) {
            this.useTurret = false;
            return;
        }
        
        const nearestEnemySpikeCollider = EnemyManager.nearestEnemySpikeCollider;
        const spikeCollider = EnemyManager.spikeCollider;
        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY);
        const turretReloaded = ModuleHandler.hasStoreItem(EStoreType.HAT, EHat.TURRET_GEAR) && reloading.isReloaded(ReloadType.TURRET);

        if (this.useTurret) {
            this.useTurret = false;
            if (turretReloaded) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            return;
        }

        if (
            nearestEnemySpikeCollider !== null &&
            !nearestEnemySpikeCollider.isTrapped &&
            spikeCollider !== null &&
            primaryReloaded
        ) {
            const pos1 = myPlayer.pos.current;
            const pos2 = nearestEnemySpikeCollider.pos.current;
            const pos3 = spikeCollider.pos.current;

            const angleToEnemy = pos1.angle(pos2);
            const distanceToSpike2 = pos2.distance(pos3);

            const turretKnockback = 60;
            const primaryKnockback = DataHandler.getWeapon(primary).knockback;
            const knockback = primaryKnockback + turretKnockback;
            const collisionScale = spikeCollider.collisionScale + nearestEnemySpikeCollider.collisionScale;
            const collisionRangeTurret = collisionScale + knockback;
            const isPrimaryEnough = distanceToSpike2 <= (collisionScale + primaryKnockback);
            if (distanceToSpike2 <= collisionRangeTurret) {

                const spear = DataHandler.getWeapon(primary);
                const hitRange = spear.range + nearestEnemySpikeCollider.hitScale;
                if (myPlayer.collidingSimple(nearestEnemySpikeCollider, hitRange)) {
                    ModuleHandler.moduleActive = true;
                    ModuleHandler.useAngle = angleToEnemy;
                    ModuleHandler.forceHat = EHat.BULL_HELMET;
                    ModuleHandler.forceWeapon = WeaponType.PRIMARY;
                    ModuleHandler.shouldAttack = true;
                    if (!isPrimaryEnough) {
                        this.useTurret = true;
                    }
                    
                    this.client.StatsManager.knockbackTickTimes = 1;

                    EnemyManager.attemptSpikePlacement();
                }
            }
        }
    }
}