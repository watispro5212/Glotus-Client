import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { findMiddleAngle } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class KnockbackTickTrap {
    readonly moduleName = "knockbackTickTrap";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._knockbackTickTrap || EnemyManager.shouldIgnoreModule()) {
            this.targetEnemy = null;
            this.useTurret = false;
            return;
        }

        const nearestEnemySpikeCollider = EnemyManager.nearestEnemySpikeCollider;
        const nearestTrappedEnemy = EnemyManager.nearestTrappedEnemy;
        const spikeCollider = EnemyManager.spikeCollider;

        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        // const isPolearm = primary === EWeapon.POLEARM;
        const isHammer = secondary === EWeapon.GREAT_HAMMER;

        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY);
        const secondaryReloaded = reloading.isReloaded(ReloadType.SECONDARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        if (this.useTurret) {
            if (turretReloaded) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            this.useTurret = false;
            return;
        }

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
            this.useTurret = true;

            // EnemyManager.attemptSpikePlacement();
            return;
        }

        if (
            nearestEnemySpikeCollider !== null &&
            nearestTrappedEnemy !== null &&
            nearestTrappedEnemy === nearestEnemySpikeCollider &&
            spikeCollider !== null &&
            // isPolearm &&
            isHammer &&
            primaryReloaded &&
            secondaryReloaded
        ) {
            const nearestTrap = nearestTrappedEnemy.trappedIn!;
            const hammer = DataHandler.getWeapon(secondary);
            const playerRange = hammer.range + nearestTrappedEnemy.hitScale;
            const trapRange = hammer.range + nearestTrap.hitScale;

            const canAttackEnemy = myPlayer.collidingSimple(nearestTrappedEnemy, playerRange);
            const canAttackTrap = myPlayer.collidingSimple(nearestTrap, trapRange);
            const buildingDamage = myPlayer.getBuildingDamage(secondary, true);
            if (!canAttackEnemy || !canAttackTrap || nearestTrap.health > buildingDamage) return;

            const pos1 = myPlayer.pos.current;
            const pos2 = nearestTrappedEnemy.pos.current;
            const pos3 = nearestTrap.pos.current;
            const pos4 = spikeCollider.pos.current;

            const angleToEnemy = pos1.angle(pos2);
            const angleToTrap = pos1.angle(pos3);
            const middleAngle = findMiddleAngle(angleToEnemy, angleToTrap);
            const distanceToSpike2 = pos2.distance(pos4);

            const turretKnockback = 60;
            const primaryKnockback = DataHandler.getWeapon(primary).knockback;
            const knockback = primaryKnockback + turretKnockback;
            const collisionRange = spikeCollider.collisionScale + nearestEnemySpikeCollider.collisionScale + knockback;
            if (distanceToSpike2 <= collisionRange) {

                ModuleHandler.moduleActive = true;
                ModuleHandler.useAngle = middleAngle;
                ModuleHandler.forceHat = EHat.TANK_GEAR;
                ModuleHandler.forceWeapon = WeaponType.SECONDARY;
                ModuleHandler.shouldAttack = true;
                this.targetEnemy = nearestTrappedEnemy;

                this.client.StatsManager.knockbackTickTrapTimes = 1;
            }
        }
    }
}