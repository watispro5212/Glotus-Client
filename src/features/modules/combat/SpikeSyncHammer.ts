import { reverseAngle } from './../../../utility/Common';
import { Items } from "../../../constants/Items";
import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { findMiddleAngle } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class SpikeSyncHammer {
    readonly moduleName = "spikeSyncHammer";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { ModuleHandler, EnemyManager, myPlayer, ObjectManager } = this.client;
        if (ModuleHandler.moduleActive || !settings._spikeSyncHammer || EnemyManager.shouldIgnoreModule()) {
        // if (ModuleHandler.moduleActive || !settings._spikeSyncHammer) {
            this.targetEnemy = null;
            this.useTurret = false;
            return;
        }

        // const nearestTrappedEnemy = EnemyManager.nearestTrappedEnemy;
        const nearestSyncEnemy = EnemyManager.nearestSyncEnemy;
        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        const isPolearm = primary !== EWeapon.STICK;
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

        if (this.targetEnemy !== null) {
            const nearest = this.targetEnemy;
            const pos1 = myPlayer.pos.current;
            const pos2 = nearest.pos.current;

            const itemType = ItemType.SPIKE;
            const spikeID = myPlayer.getItemByType(itemType);
            const placeLength = myPlayer.getItemPlaceScale(spikeID);
            const angleToNearest = pos1.angle(pos2);
            const spikePos = pos1.addDirection(angleToNearest, placeLength);

            const angleFromSpike = spikePos.angle(pos2);
            const futureEnemyPos = spikePos.addDirection(angleFromSpike, 140);
            const futureAngle = pos1.angle(futureEnemyPos);

            const placementAngles = EnemyManager.nearestSpikePlacerAngle;
            if (placementAngles !== null) {
                for (const angle of placementAngles) {
                    ModuleHandler.place(itemType, angle);
                }
                ModuleHandler.placedOnce = true;
                ModuleHandler.placeAngles[0] = itemType;
                ModuleHandler.placeAngles[1] = placementAngles;

                ModuleHandler.moduleActive = true;
                ModuleHandler.useAngle = futureAngle;
                ModuleHandler.forceHat = EHat.BULL_HELMET;
                ModuleHandler.forceWeapon = WeaponType.PRIMARY;
                ModuleHandler.shouldAttack = true;
            }
            this.targetEnemy = null;
            this.useTurret = true;
            return;
        }

        if (
            nearestSyncEnemy !== null &&
            isPolearm && primaryReloaded &&
            isHammer && secondaryReloaded
        ) {
            // const nearestTrap = nearestTrappedEnemy.trappedIn!;
            const nearestLowHPObject = EnemyManager.nearestLowHPObject;
            if (nearestLowHPObject === null) return;

            const hammer = DataHandler.getWeapon(secondary);

            const playerRange = hammer.range + nearestSyncEnemy.hitScale;
            const trapRange = hammer.range + nearestLowHPObject.hitScale;
            
            // WE MUST CHECK IF WE CAN ATTACK BOTH PLAYER AND TRAP. CUZ IN SOME EDGE CASES WE CANT ATTACK AND IT CAUSES ISSUES
            const canAttackEnemy = myPlayer.collidingSimple(nearestSyncEnemy, playerRange);
            const canAttackTrap = myPlayer.collidingSimple(nearestLowHPObject, trapRange);
            const buildingDamage = myPlayer.getBuildingDamage(secondary, true);
            if (!canAttackEnemy || !canAttackTrap || nearestLowHPObject.health > buildingDamage) return;

            const itemType = ItemType.SPIKE;
            const spikeID = myPlayer.getItemByType(itemType);
            const placeLength = myPlayer.getItemPlaceScale(spikeID);
    
            const pos1 = myPlayer.pos.current;
            const pos2 = nearestSyncEnemy.pos.current;
            const pos3 = nearestLowHPObject.pos.current;
            const angleToEnemy = pos1.angle(pos2);
            const angleToTrap = pos1.angle(pos3);
            const middleAngle = findMiddleAngle(angleToEnemy, angleToTrap);

            const angles = ObjectManager.getBestPlacementAngles({
                position: pos1,
                id: spikeID,
                targetAngle: angleToEnemy,
                ignoreID: nearestLowHPObject.id,
                preplace: false,
                reduce: false,
                fill: false,
            });
            const spikeScale = Items[spikeID].scale;
            const possibleAngles = angles.filter(angle => {
                const spikePos = pos1.addDirection(angle, placeLength);
                const distance = pos2.distance(spikePos);
                const range = nearestSyncEnemy.collisionScale + spikeScale;
                return distance <= range;
            });

            if (possibleAngles.length !== 0) {
                ModuleHandler.placeAngles[0] = itemType;
                ModuleHandler.placeAngles[1] = possibleAngles;

                ModuleHandler.moduleActive = true;
                ModuleHandler.useAngle = middleAngle;
                ModuleHandler.forceHat = EHat.TANK_GEAR;
                ModuleHandler.forceWeapon = WeaponType.SECONDARY;
                ModuleHandler.shouldAttack = true;
                this.targetEnemy = nearestSyncEnemy;

                this.client.StatsManager.spikeSyncHammerTimes = 1;
            }
        }
    }
}