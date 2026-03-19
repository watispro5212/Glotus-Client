import type Player from "../../../data/Player";
import type Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType, WeaponVariant } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { inRange } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

// const calculatePreciseAngle = (player: Vector, target: Vector, speed: number, minRange: number, maxRange: number) => {
//     const distance = player.distance(target);
//     if (inRange(distance, minRange, maxRange)) return null;
//     const targetDistance = (minRange + maxRange) / 2;
    
//     if (distance > targetDistance + speed) return null;//player.angle(target);
//     if (distance < Math.abs(targetDistance - speed)) return null;//target.angle(player);
//     if (distance === 0) return 0;
    
//     const a = (distance * distance + targetDistance * targetDistance - speed * speed) / (2 * distance);
//     const hSquared = targetDistance * targetDistance - a * a;
//     if (hSquared < 0) return null;//player.angle(target);
    
//     const dirX = (target.x - player.x) / distance;
//     const dirY = (target.y - player.y) / distance;
//     const h = Math.sqrt(hSquared);
//     const px = target.x - a * dirX;
//     const py = target.y - a * dirY;
//     const ix = px + h * dirY;
//     const iy = py - h * dirX;

//     return Math.atan2(iy - player.y, ix - player.x);
// }

export default class VelocityTick {
    readonly moduleName = "velocityTick";
    private readonly client: PlayerClient;

    private nearestTarget: Player | null = null;
    target: Player | null = null;

    minKB = 220;
    maxKB = 245;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private isValidHat(hatID: EHat | null) {
        return hatID !== null && hatID !== EHat.SOLDIER_HELMET && hatID !== EHat.EMP_HELMET;
    }

    postTick() {
        const { EnemyManager, myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;
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
        const isReloadedPrimary = reloading.isReloaded(WeaponType.PRIMARY, 1);
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

        // myPlayer.simulation.reset(this.client);
        // myPlayer.simulation.update(this.client, true);
        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.future;
        const dist1 = pos1.distance(pos2);
        const angle = pos1.angle(pos2);

        // if (dist2 < 205 || dist2 - speed >= 205) return;

        const { current } = nearestEnemy.weapon;
        const type = DataHandler.getWeapon(current).type;
        const almostReloaded = DataHandler.isMelee(current) && nearestEnemy.atExact(type, 1);
        const detectFutureHat = this.isValidHat(nearestEnemy.futureHat);
        const canSend = almostReloaded || detectFutureHat;
        const inAttackRange = inRange(dist1, this.minKB, this.maxKB);
        if (inAttackRange) {
            if (canSend) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
                ModuleHandler.moveTo = angle;
                this.nearestTarget = nearestEnemy;
                this.client.StatsManager.velocityTickTimes = 1;
            }
            // return;
        }

        // myPlayer.simulation.movementSimulation(this.client, angle);
        // const pos0 = myPlayer.simulation.getPos().copy();
        // const dist2 = pos0.distance(pos2);
        // const speed = myPlayer.simulation.getSpeed();

        // if (inRange(dist2, this.minKB, this.maxKB)) return;
        // const moveAngle = calculatePreciseAngle(pos1, pos2, speed, this.minKB, this.maxKB);
        // if (moveAngle === null) return;
        // ModuleHandler.moduleActive = true;
        // ModuleHandler.moveTo = moveAngle;
        // const middleRange = (this.maxKB + this.minKB) / 2;
    }
}