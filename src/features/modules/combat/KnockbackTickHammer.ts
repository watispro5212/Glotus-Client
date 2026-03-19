import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { inRange } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class KnockbackTickHammer {
    readonly moduleName = "knockbackTickHammer";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._knockbackTickHammer || EnemyManager.shouldIgnoreModule()) {
            this.targetEnemy = null;
            return;
        }

        const nearestEnemySpikeCollider = EnemyManager.nearestEnemySpikeCollider;
        const spikeCollider = EnemyManager.spikeCollider;
        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const isHammer = secondary !== null && secondary !== EWeapon.WOODEN_SHIELD;
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY, 1);
        const secondaryReloaded = reloading.isReloaded(ReloadType.SECONDARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        // ATTACKING WITH SPEAR AND BULL IF WE FOUND TARGET PREVIOUSLY
        const pos1 = myPlayer.pos.current;
        if (this.targetEnemy !== null) {
            const pos2 = this.targetEnemy.pos.current
            const angleToEnemy = pos1.angle(pos2);
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angleToEnemy;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            this.targetEnemy = null;

            EnemyManager.attemptSpikePlacement();
            return;
        }

        if (
            nearestEnemySpikeCollider !== null &&
            !nearestEnemySpikeCollider.isTrapped &&
            spikeCollider !== null &&
            isHammer &&
            primaryReloaded &&
            secondaryReloaded &&
            turretReloaded
        ) {
            const pos2 = nearestEnemySpikeCollider.pos.current;
            const pos3 = spikeCollider.pos.current;

            const angleToEnemy = pos1.angle(pos2);
            const distanceToSpike2 = pos2.distance(pos3);

            const turretKnockback = 60;
            const { knockback: primaryKnockback, range: primaryRange } = DataHandler.getWeapon(primary);
            const { knockback: secondaryKnockback, range: secondaryRange } = DataHandler.getWeapon(secondary);
            const weaponRange = Math.min(primaryRange, secondaryRange) + nearestEnemySpikeCollider.hitScale;

            const minKB = primaryKnockback + turretKnockback;
            const maxKB = primaryKnockback + secondaryKnockback + turretKnockback;
            const spikeRange = spikeCollider.collisionScale + nearestEnemySpikeCollider.collisionScale;
            
            if (
                inRange(distanceToSpike2, spikeRange + minKB, spikeRange + maxKB) &&
                myPlayer.collidingSimple(nearestEnemySpikeCollider, weaponRange)
            ) {

                const hammer = DataHandler.getWeapon(secondary);
                const hitRange = hammer.range + nearestEnemySpikeCollider.hitScale;
                if (myPlayer.collidingSimple(nearestEnemySpikeCollider, hitRange)) {
                    ModuleHandler.moduleActive = true;
                    ModuleHandler.useAngle = angleToEnemy;
                    ModuleHandler.forceHat = EHat.TURRET_GEAR;
                    ModuleHandler.forceWeapon = WeaponType.SECONDARY;
                    ModuleHandler.shouldAttack = true;
                    this.targetEnemy = nearestEnemySpikeCollider;

                    this.client.StatsManager.knockbackTickHammerTimes = 1;
                    EnemyManager.attemptSpikePlacement();
                }
            }
        }
    }
}