import type { PlayerObject, Resource } from "../../../data/ObjectItem";
import Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { getAngleDist } from "../../../utility/Common";
import settings from "../../../utility/Settings";

/** Used to create safe movement on the map. Stops before spikes, cactuses, teleports and boostpads that can create unpredictable behavior */
export default class SafeWalk {
    readonly moduleName = "safeWalk";
    private readonly client: PlayerClient;
    private movingState = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    reset() {
        this.movingState = false;
    }

    // movingInDirectionOf(target: PlayerObject | Resource) {
    //     const { ModuleHandler, myPlayer } = this.client;

    //     let move_dir = ModuleHandler.move_dir;
    //     if (move_dir === null && myPlayer.speed !== 0) {
    //         move_dir = myPlayer.move_dir;
    //     }
    //     if (move_dir === null) return false;

    //     const pos1 = myPlayer.pos.current;
    //     const pos2 = target.pos.current;
    //     const distance = pos1.distance(pos2);
    //     const angle = pos1.angle(pos2);

    //     const offset = Math.asin((2 * (myPlayer.collisionScale + target.collisionScale)) / (2 * distance));
    //     const movingAt = getAngleDist(move_dir, angle) <= offset;
    //     return movingAt;
    // }

    willGetHit(angle: number | null, speed: number, target: PlayerObject | Resource | null): boolean {
        if (angle === null || !settings._safeWalk) return false;
        const { myPlayer } = this.client;
        const nearestCollider = target;
        if (nearestCollider === null) return false;

        const future = Vector.fromAngle(angle, speed + myPlayer.speed / 4).add(myPlayer.pos.current);
        const distance = future.distance(nearestCollider.pos.current);
        const range = myPlayer.collisionScale + nearestCollider.collisionScale;
        if (distance > range) return false;
        return true;
    }

    postTick() {
        const { ModuleHandler, myPlayer, ObjectManager, EnemyManager } = this.client;

        // ModuleHandler.moveTo = 0;
        const { prevMoveTo, moveTo } = ModuleHandler;
        if (prevMoveTo !== moveTo) {
            const angle = moveTo === "disable" ? ModuleHandler.move_dir : moveTo;
            ModuleHandler.startMovement(angle, true);
            return;
        }

        const offset = myPlayer.speed + 45;
        if (this.willGetHit(ModuleHandler.move_dir, offset, EnemyManager.nearestCollider) ||
            this.willGetHit(ModuleHandler.move_dir, offset, EnemyManager.secondNearestCollider)
        ) {
            if (!this.movingState) {
                this.movingState = true;
                ModuleHandler.stopMovement();
            }
            return;
        }

        if (this.movingState) {
            this.movingState = false;
            ModuleHandler.startMovement();
        }
    }
}