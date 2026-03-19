import Config from "../../../constants/Config";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, WeaponType } from "../../../types/Items";
import { findMiddleAngle, getAngleDist } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AutoShield {
    readonly moduleName = "autoShield";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getProtectAngle() {
        const { myPlayer: myPlayer, EnemyManager } = this.client;
        const nearestEnemy = EnemyManager.nearestEnemy!;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);
        const secondNearestEnemy = EnemyManager.secondNearestEnemy;
        if (!secondNearestEnemy) return angle;

        const pos3 = secondNearestEnemy.pos.current;
        const distance = pos1.distance(pos3);
        const primary = secondNearestEnemy.weapon.primary!;
        const weaponRange = DataHandler.getWeapon(primary).range;
        const range = weaponRange + myPlayer.hitScale;

        const angle2 = pos1.angle(pos3);
        const middleAngle = findMiddleAngle(angle, angle2);
        if (
            distance <= range &&
            getAngleDist(angle, middleAngle) <= Config.gatherAngle &&
            getAngleDist(angle2, middleAngle) <= Config.gatherAngle
        ) {
            return middleAngle;
        }

        return angle;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer, EnemyManager } = this.client;
        if (!settings._autoShield || ModuleHandler.moduleActive) return;
        
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null) return;

        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const hasShield = secondary === EWeapon.WOODEN_SHIELD;
        if (!hasShield) return;

        // const { antiInsta } = ModuleHandler.staticModules;
        const shouldActivate = /* antiInsta.forceHeal ||  */EnemyManager.weaponDamageThreat();
        if (!shouldActivate) return;

        const angle = this.getProtectAngle();
        ModuleHandler.moduleActive = true;
        ModuleHandler.forceWeapon = WeaponType.SECONDARY;
        ModuleHandler.useAngle = angle;
        ModuleHandler.shouldAttack = true;
    }
}