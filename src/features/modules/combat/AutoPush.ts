import type Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { getAngleDist } from "../../../utility/Common";
import settings from "../../../utility/Settings";

export default class AutoPush {
    readonly moduleName = "autoPush";
    private readonly client: PlayerClient;

    pushPos: Vector | null = null;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { EnemyManager, myPlayer: myPlayer, _ModuleHandler: ModuleHandler, ObjectManager, PlayerManager } = this.client;

        this.pushPos = null;
        
        const nearestEnemyPush = EnemyManager.nearestEnemyPush;
        const nearestPushSpike = EnemyManager.nearestPushSpike;
        EnemyManager.nearestEnemyPush = null;
        EnemyManager.nearestPushSpike = null;
        if (ModuleHandler.moduleActive || !settings._autoPush || ModuleHandler.moveTo !== "disable") return;
        if (nearestEnemyPush === null || nearestPushSpike === null) return;

        const trappedIn = nearestEnemyPush.trappedIn;
        if (trappedIn === null || myPlayer.trappedIn) return;

        const pos0 = myPlayer.pos.current;
        const pos1 = nearestEnemyPush.pos.current;
        const pos2 = nearestPushSpike.pos.current;
        // const pos3 = trappedIn.pos.current;

        // ACTIVATION MUST BE IN CERTAIN RADIUS
        // ALSO DONT PUSH IF ENEMY IS ALREADY PUSHED
        if (
            !myPlayer.collidingSimple(nearestEnemyPush, 250) ||
            // nearestEnemyPush.collidingObject(nearestPushSpike, 0, CollideType.ALL)
            nearestEnemyPush.colliding(nearestPushSpike, nearestEnemyPush.collisionScale + nearestPushSpike.collisionScale + 1)
        ) return;

        const distanceFromSpikeToEnemy = pos2.distance(pos1);
        const angleFromSpikeToEnemy = pos2.angle(pos1);
        
        // const activationScale = nearestPushSpike.collisionScale;
        const angleToEnemy = pos0.angle(pos1);
        const angleToSpike = pos0.angle(pos2);
        // const distanceToEnemy = pos0.distance(pos1);
        
        // DETECT IF myPlayer IS IN PUSHING ANGLE RANGE
        // WE CANT MOVE TO MOVEPOS, IF IN FRONT OF US SOME OBSTACLE
        const distanceToSpike = pos0.distance(pos2);
        // const offset = Math.asin((2 * activationScale) / (2 * distanceToSpike));
        // const angleDistance = getAngleDist(angleToEnemy, angleToSpike);
        // const intersecting = angleDistance <= offset;
        // const spikeIsCloser = distanceToSpike < distanceToEnemy;
        // if (intersecting && spikeIsCloser) return;

        // IF SOME OBSTACLE COULD BLOCK OUR MOVEMENT, THEN IGNORE
        // SPIKES ARE TRICKY, WE DOnT WANT TO GET PUSHED AWAY
        const pushPos = pos2.addDirection(angleFromSpikeToEnemy, distanceFromSpikeToEnemy + nearestEnemyPush.collisionScale + 7);
        const objectIDs = ObjectManager.grid2D.queryFull(pushPos.x, pushPos.y, 1);
        for (const id of objectIDs) {
            const object = ObjectManager.objects.get(id)!;
            if (PlayerManager.canMoveOnTop(object)) continue;
            
            const pos = object.pos.current;
            const distance = pushPos.distance(pos);
            const playerScale = myPlayer.collisionScale * 1.3;
            const range = object.collisionScale + playerScale;
            if (distance <= range) {
                return;
            }
        }

        this.pushPos = pos2.addDirection(angleFromSpikeToEnemy, distanceFromSpikeToEnemy + 250);
        ModuleHandler.moveTo = pos0.angle(this.pushPos);
        EnemyManager.nearestEnemyPush = nearestEnemyPush;
        EnemyManager.nearestPushSpike = nearestPushSpike;

        const activationScale2 = nearestEnemyPush.collisionScale * 3.2;
        const offset2 = Math.asin((2 * activationScale2) / (2 * distanceToSpike));
        const angleDistance2 = getAngleDist(angleToEnemy, angleToSpike);
        const intersecting2 = angleDistance2 <= offset2;
        if (!intersecting2) return;

        this.pushPos = pushPos;
        ModuleHandler.moveTo = pos0.angle(this.pushPos);
    }
}