import Config from "../../../constants/Config";
import type { PlayerObject } from "../../../data/ObjectItem";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, WeaponType, type TMelee } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { findMiddleAngle, getAngleDist } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class Autobreak {
    readonly moduleName = "autoBreak";
    private readonly client: PlayerClient;
    
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getWeaponRange<T extends EWeapon | null>(id: T, target: PlayerObject) {
        if (id === null) return 0;
        if (DataHandler.isMelee(id)) {
            return DataHandler.getWeapon(id).range + target.hitScale;
        }

        return 0;
    }

    private getDestroyingObject(): [ PlayerObject | null, PlayerObject | null ] {
        const { EnemyManager, myPlayer: myPlayer } = this.client;

        const pos0 = myPlayer.pos.current;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        const isPrimary = primary !== EWeapon.STICK && primary !== EWeapon.POLEARM && primary !== EWeapon.BAT;
        const isHammer = secondary === EWeapon.GREAT_HAMMER;

        const nearestTrap = EnemyManager.nearestTrap || EnemyManager.nearestEnemyObject || EnemyManager.secondNearestEnemyObject;
        const nearestSpike = EnemyManager.nearestSpike || EnemyManager.nearestEnemyObject || EnemyManager.secondNearestEnemyObject;

        if (nearestSpike) {
            const pos2 = nearestSpike.pos.current;
            const distPlayerSpike = pos0.distance(pos2);
            const canUseHammer = isHammer && distPlayerSpike <= this.getWeaponRange(secondary, nearestSpike);

            if (nearestTrap) {
                const canUsePrimary = isPrimary && distPlayerSpike <= this.getWeaponRange(primary, nearestSpike);
                if (canUseHammer || canUsePrimary) {
                    return [ nearestSpike, nearestTrap ];
                }
                return [ nearestTrap, nearestSpike ];
            }

            if (canUseHammer) {
                return [ nearestSpike, nearestTrap ];
            }
        }

        return [ nearestTrap, nearestSpike ];
    }

    private getDestroyingWeapon(target: PlayerObject): WeaponType | null {
        const { myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;

        const pos0 = myPlayer.pos.current;
        const pos1 = target.pos.current;
        const distance = pos0.distance(pos1);

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        const inPrimaryRange = distance <= this.getWeaponRange(primary, target);
        const inSecondaryRange = distance <= this.getWeaponRange(secondary, target);

        const isHammer = secondary === EWeapon.GREAT_HAMMER;
        const notStick = primary !== EWeapon.STICK;
        const notPolearm = primary !== EWeapon.POLEARM;

        const { reloading } = ModuleHandler.staticModules;
        const primaryDamage = myPlayer.getBuildingDamage(primary, false);
        if (
            inPrimaryRange &&
            isHammer && notStick && notPolearm &&
            (!reloading.isReloaded(WeaponType.SECONDARY) || reloading.isFasterThan(WeaponType.PRIMARY, WeaponType.SECONDARY)) &&
            primaryDamage >= target.health
        ) {
            return WeaponType.PRIMARY;
        }

        if (isHammer && inSecondaryRange) return WeaponType.SECONDARY;
        if (notStick && (notPolearm || !isHammer) && inPrimaryRange) return WeaponType.PRIMARY;

        return null;
    }

    postTick(): void {
        
        const { EnemyManager, myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;
        if (!settings._autobreak || ModuleHandler.moduleActive) return;

        const [ target, secondTarget ] = this.getDestroyingObject();
        if (target === null) return;

        const type = this.getDestroyingWeapon(target);
        if (type === null) return;

        const weapon = myPlayer.getItemByType(type) as TMelee;
        const range = this.getWeaponRange(weapon, target);
        const pos1 = myPlayer.pos.current;
        const pos2 = target.pos.current;
        const distance = pos1.distance(pos2);
        if (distance > range) return;
        
        const angle1 = pos1.angle(pos2);
        let angle = angle1;

        // HANDLE DESTRUCTION OF MULTIPLE OBJECTS AT ONCE
        // if (secondTarget !== null && target !== secondTarget) {
        //     const pos3 = secondTarget.pos.current;

        //     const angle2 = pos1.angle(pos3);
        //     const middleAngle = findMiddleAngle(angle1, angle2);
        //     if (
        //         myPlayer.colliding(target, range + secondTarget.hitScale) &&
        //         getAngleDist(angle1, middleAngle) <= Config.gatherAngle &&
        //         getAngleDist(angle2, middleAngle) <= Config.gatherAngle
        //     ) {
        //         angle = middleAngle;
        //     }
        // }

        const buildingDamage = myPlayer.getBuildingDamage(weapon, false);
        const isEnoughDamage = target.health <= buildingDamage;

        const nearestEnemy = EnemyManager.nearestEnemy;
        const totalDamage = EnemyManager.primaryDamage + EnemyManager.potentialSpikeDamage;
        const shouldIgnore = (
            EnemyManager.instaThreat() ||
            nearestEnemy !== null && nearestEnemy.reload[0].previous !== nearestEnemy.reload[0].current &&
            myPlayer.currentHealth <= totalDamage && myPlayer.currentHealth > totalDamage * 0.75
        );

        const { reloading } = ModuleHandler.staticModules;
        ModuleHandler.forceWeapon = type;
        if (reloading.isReloaded(type) && !shouldIgnore) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            if (!isEnoughDamage) {
                ModuleHandler.forceHat = EHat.TANK_GEAR;
            }
            ModuleHandler.shouldAttack = true;
        }
    }
}
// class Autobreak {
//     readonly moduleName = "autoBreak";
//     private readonly client: PlayerClient;
    
//     constructor(client: PlayerClient) {
//         this.client = client;
//     }

//     postTick(): void {
        
//         const { EnemyManager, myPlayer, ModuleHandler } = this.client;
//         if (!settings._autobreak || ModuleHandler.moduleActive) return;

//         const nearestEnemy = EnemyManager.nearestEnemy;
//         let secondNearestEnemyObject = EnemyManager.secondNearestEnemyObject;
//         let nearestEnemyObject = EnemyManager.nearestEnemyObject;
//         const nearestTrap = EnemyManager.nearestTrap;
//         const nearestSpike = EnemyManager.nearestSpike;
//         let nearestTarget = nearestTrap || nearestEnemyObject;
//         if (nearestTarget === null) return;

//         let type = myPlayer.getBestDestroyingWeapon(nearestTarget);
//         if (type === null) return;
        
//         const pos1 = myPlayer.pos.current;
//         let weaponRange = myPlayer.getWeaponRangeByType(type);
//         if (
//             nearestTrap !== null && nearestSpike !== null && nearestEnemy !== null &&
//             !nearestEnemy.isTrapped && EnemyManager.dangerWithoutSoldier
//         ) {
            
//             const typeData = myPlayer.getMaxRangeTypeDestroy();
//             if (typeData !== null && myPlayer.colliding(nearestSpike, typeData.range + nearestSpike.hitScale)) {

//                 const tempType = myPlayer.getBestDestroyingWeapon(nearestSpike)!;
//                 const tempWeaponRange = myPlayer.getWeaponRangeByType(tempType);
//                 if (myPlayer.colliding(nearestSpike, tempWeaponRange + nearestSpike.hitScale)) {
//                     nearestTarget = nearestSpike;
//                     nearestEnemyObject = nearestSpike;
//                     secondNearestEnemyObject = nearestTrap;

//                     type = tempType;
//                     weaponRange = tempWeaponRange;
//                 }
//             }
//         }

//         const weapon = myPlayer.getItemByType(type) as TMelee;
//         const weaponDamage = myPlayer.getBuildingDamage(weapon, false);
//         // const weaponTankDamage = myPlayer.getBuildingDamage(weapon, true);

//         const pos2 = nearestTarget.pos.current;
//         if (nearestTarget === nearestEnemyObject && !myPlayer.colliding(nearestTarget, weaponRange + nearestTarget.hitScale)) {
//             return;
//         }

//         let angle = pos1.angle(pos2);

//         // HANDLE DESTRUCTION OF MULTIPLE OBJECTS AT ONCE
//         if (secondNearestEnemyObject !== null && nearestTarget !== secondNearestEnemyObject) {
//             const pos3 = secondNearestEnemyObject.pos.current;
//             const distance = pos1.distance(pos3);
//             const range = weaponRange + secondNearestEnemyObject.hitScale;

//             const angle2 = pos1.angle(pos3);
//             const middleAngle = findMiddleAngle(angle, angle2);
//             if (
//                 distance <= range &&
//                 getAngleDist(angle, middleAngle) <= Config.gatherAngle &&
//                 getAngleDist(angle2, middleAngle) <= Config.gatherAngle
//             ) {
//                 angle = middleAngle;
//             }
//         }

//         let shouldUseTank = true;
//         if (
//             (EnemyManager.primaryDamage + EnemyManager.potentialSpikeDamage) >= 100 ||
//             EnemyManager.instaThreat()
//         ) {
//             shouldUseTank = false;
//         }

//         const { reloading } = ModuleHandler.staticModules;
//         ModuleHandler.forceWeapon = type;
//         if (reloading.isReloaded(type)) {
//             ModuleHandler.moduleActive = true;
//             ModuleHandler.useAngle = angle;
//             if (shouldUseTank) {
//                 ModuleHandler.forceHat = EHat.TANK_GEAR;
//             }
//             ModuleHandler.shouldAttack = true;
//         }
//     }
// }