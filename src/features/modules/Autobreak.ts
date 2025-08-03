import Config from "../../constants/Config";
import type { PlayerObject } from "../../data/ObjectItem";
import PlayerClient from "../../PlayerClient";
import type { WeaponType } from "../../types/Items";
import { EHat } from "../../types/Store";
import { findMiddleAngle, getAngleDist } from "../../utility/Common";
import settings from "../../utility/Settings";

class Autobreak {
    readonly moduleName = "autoBreak";
    private readonly client: PlayerClient;
    
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        
        const { EnemyManager, myPlayer, ModuleHandler } = this.client;
        if (!settings._autobreak || ModuleHandler.moduleActive) return;

        const secondNearestEnemyObject = EnemyManager.secondNearestEnemyObject;
        const nearestEnemyObject = EnemyManager.nearestEnemyObject;
        const nearestTrap = EnemyManager.nearestTrap;
        const nearestSpike = EnemyManager.nearestSpike;
        let nearestTarget = nearestTrap || nearestEnemyObject;
        if (nearestTarget === null) return;

        const type = myPlayer.getBestDestroyingWeapon();
        if (type === null) return;
        
        const pos1 = myPlayer.pos.current;
        const weaponRange = myPlayer.getWeaponRangeByType(type);
        if (nearestTrap !== null && nearestSpike !== null) {
            const pos2 = nearestSpike.pos.current;
            const distance = pos1.distance(pos2);
            const range = weaponRange + nearestSpike.hitScale;
            if (distance <= range) {
                nearestTarget = nearestSpike;
            }
        }

        const pos2 = nearestTarget.pos.current;
        const distance = pos1.distance(pos2);
        const range = weaponRange + nearestTarget.hitScale;
        if (nearestTarget === nearestEnemyObject && distance > range) {
            return;
        }

        let angle = pos1.angle(pos2);
        if (secondNearestEnemyObject !== null && nearestTarget !== secondNearestEnemyObject) {
            const pos3 = secondNearestEnemyObject.pos.current;
            const distance = pos1.distance(pos3);
            const range = weaponRange + secondNearestEnemyObject.hitScale;

            const angle2 = pos1.angle(pos3);
            const middleAngle = findMiddleAngle(angle, angle2);
            if (
                distance <= range &&
                getAngleDist(angle, middleAngle) <= Config.gatherAngle &&
                getAngleDist(angle2, middleAngle) <= Config.gatherAngle
            ) {
                angle = middleAngle;
            }
        }

        const { reloading } = ModuleHandler.staticModules;
        if (nearestTrap !== null) ModuleHandler.forceWeapon = type;
        if (reloading.isReloaded(type)) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            if (nearestTrap === null) {
                ModuleHandler.forceWeapon = type;
            }
            ModuleHandler.forceHat = EHat.TANK_GEAR;
            ModuleHandler.shouldAttack = true;
        }
    }
}

export default Autobreak;