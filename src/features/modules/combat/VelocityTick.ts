import type Player from "../../../data/Player";
import type Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType, WeaponVariant } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { inRange } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

// const curvedMotion = (currentPos: Vector, targetPos: Vector, speed: number, minRange: number, maxRange: number) => {
//     const distance = currentPos.distance(targetPos);

//     if (distance >= minRange && distance <= maxRange) {
//         return null;
//     }

//     const desiredRange = (minRange + maxRange) / 2;
//     const dx = targetPos.x - currentPos.x;
//     const dy = targetPos.y - currentPos.y;
//     const dirX = dx / distance;
//     const dirY = dy / distance;

//     if (distance > desiredRange + speed) {
//         return Math.atan2(dy, dx);
//     }

//     if (distance < Math.abs(desiredRange - speed)) {
//         return Math.atan2(-dy, -dx);
//     }

//     if (distance === 0) {
//         return 0;
//     }

//     const a = (distance * distance + desiredRange * desiredRange - speed * speed) / (2 * distance);
//     const hSquared = desiredRange * desiredRange - a * a;

//     if (hSquared < 0) {
//         return Math.atan2(dy, dx);
//     }

//     const h = Math.sqrt(hSquared);

//     const px = targetPos.x - a * dirX;
//     const py = targetPos.y - a * dirY;

//     const ix = px + h * dirY;
//     const iy = py - h * dirX;
//     return Math.atan2(iy - currentPos.y, ix - currentPos.x);
// }

export default class VelocityTick {
    readonly moduleName = "velocityTick";
    private readonly client: PlayerClient;

    private nearestTarget: Player | null = null;
    target: Player | null = null;

    readonly minKB = 220;
    readonly maxKB = 245;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private isValidHat(hatID: EHat | null) {
        return hatID !== null && hatID !== EHat.SOLDIER_HELMET && hatID !== EHat.EMP_HELMET;
    }

    postTick() {
        const { EnemyManager, myPlayer, ModuleHandler } = this.client;
        this.target = null;

        if (
            ModuleHandler.moduleActive ||
            !settings._velocityTick ||
            ModuleHandler.moveTo !== "disable" ||
            EnemyManager.shouldIgnoreModule()
        ) {
            this.nearestTarget = null;
            return;
        }

        const { reloading } = ModuleHandler.staticModules;
        const nearestEnemy = EnemyManager.nearestEnemy;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isPolearm = primary === EWeapon.POLEARM;
        const isDiamond = myPlayer.getWeaponVariant(primary).current >= WeaponVariant.DIAMOND;
        const isReloadedPrimary = reloading.isReloaded(WeaponType.PRIMARY);
        const isReloadedTurret = reloading.isReloaded(ReloadType.TURRET);

        if (this.nearestTarget !== null) {
            const pos1 = myPlayer.pos.current;
            const pos2 = this.nearestTarget.pos.current;
            const angle = pos1.angle(pos2);

            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            ModuleHandler.moveTo = angle;
            this.nearestTarget = null;
            return;
        }

        if (
            nearestEnemy === null ||
            !isPolearm ||
            !isDiamond ||
            !isReloadedPrimary ||
            !isReloadedTurret
        ) return;
        
        this.target = nearestEnemy;
        const pos0 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.future;
        const distance = pos0.distance(pos2);
        const angle = pos0.angle(pos2);
        
        const { current } = nearestEnemy.weapon;
        const type = DataHandler.getWeapon(current).type;
        const almostReloaded = DataHandler.isMelee(current) && nearestEnemy.atExact(type, 1);
        const detectFutureHat = this.isValidHat(nearestEnemy.futureHat);
        const canSend = almostReloaded || detectFutureHat;
        const inAttackRange = inRange(distance, this.minKB, this.maxKB);

        if (inAttackRange && canSend) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.forceHat = EHat.TURRET_GEAR;
            ModuleHandler.moveTo = angle;
            this.nearestTarget = nearestEnemy;
            this.client.StatsManager.velocityTickTimes = 1;
        }
    }
}