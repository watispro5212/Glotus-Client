import type PlayerClient from "../../../PlayerClient";
import { EAttack } from "../../../types/Enums";
import { WeaponType } from "../../../types/Items";
import DataHandler from "../../../utility/DataHandler";

export default class UseAttacking {
    readonly moduleName = "useAttacking";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getWeaponType() {
        const { EnemyManager, myPlayer, ModuleHandler } = this.client;

        const pos1 = myPlayer.pos.future;
        const nearestEntity = EnemyManager.nearestEntity;
        const nearestObject = EnemyManager.nearestObject;

        const primaryID = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondaryID = myPlayer.getItemByType(WeaponType.SECONDARY);

        const primary = DataHandler.getWeapon(primaryID);
        const range = primary.range;

        // HANDLE NEAREST ENEMIES
        if (nearestEntity !== null) {
            const pos2 = nearestEntity.pos.future;
            const angle = pos1.angle(pos2);
            if (myPlayer.collidingEntity(nearestEntity, range + nearestEntity.hitScale)) {
                return [WeaponType.PRIMARY, angle] as const;
            }

            if (DataHandler.isShootable(secondaryID) && !ModuleHandler.autoattack) {
                return [WeaponType.SECONDARY, angle] as const;
            }
        }

        // NEAREST OBJECT DOESNT EXIST, IGNORE
        if (nearestObject === null) return null;

        // const pos2 = nearestObject.pos.current;
        // const angle1 = pos1.angle(pos2);

        // HANDLE DESTRUCTION OF MULTIPLE OBJECTS AT ONCE
        // if (secondNearestObject !== null && nearestObject !== secondNearestObject) {
        //     const pos3 = secondNearestObject.pos.current;

        //     const angle2 = pos1.angle(pos3);
        //     const middleAngle = findMiddleAngle(angle1, angle2);
        //     if (
        //         myPlayer.colliding(nearestObject, range + secondNearestObject.hitScale) &&
        //         getAngleDist(angle1, middleAngle) <= Config.gatherAngle &&
        //         getAngleDist(angle2, middleAngle) <= Config.gatherAngle
        //     ) {
        //         return [WeaponType.PRIMARY, middleAngle] as const;
        //     }
        // }

        if (myPlayer.colliding(nearestObject, range + nearestObject.hitScale)) {
            return [WeaponType.PRIMARY, null] as const;
        }

        return null;
    }

    postTick() {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (
            ModuleHandler.moduleActive ||
            ModuleHandler.attackingState !== EAttack.ATTACK ||
            ModuleHandler.forceWeapon !== null
        ) return;
        
        const weaponType = this.getWeaponType();
        if (weaponType === null) return;
        const [ type, angle ] = weaponType;

        ModuleHandler.forceWeapon = type;
        if (angle !== null) {
            ModuleHandler.useAngle = angle;
        }
        ModuleHandler.shouldAttack = true;
    }
}