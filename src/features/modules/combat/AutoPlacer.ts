import { Items } from "../../../constants/Items";
import { PlayerObject } from "../../../data/ObjectItem";
import type Player from "../../../data/Player";
import type Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { EItem, ItemGroup, ItemType } from "../../../types/Items";
import { getAngleDist } from "../../../utility/Common";
import settings from "../../../utility/Settings";

class AutoPlacer {
    readonly moduleName = "autoPlacer";
    private readonly client: PlayerClient;

    private placementCount = 0;
    private readonly angleList = new Map<number, number>();
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private canKnockbackSpike(newSpikePos: Vector, scale: number, enemy: Player): boolean {
        const pos1 = newSpikePos;
        const pos2 = enemy.pos.current;
        const knockbackAngle = pos1.angle(pos2);
        const hasEnoughDistance = pos1.distance(pos2) <= (enemy.collisionScale + scale);
        if (!hasEnoughDistance) return false;

        const { ObjectManager, PlayerManager } = this.client;
        return ObjectManager.grid2D.query(pos1.x, pos1.y, 3, (id) => {
            const object = ObjectManager.objects.get(id);
            if (!object) return;

            const pos3 = object.pos.current;
            const isPlayerObject = object instanceof PlayerObject;
            const isCactus = !isPlayerObject && object.isCactus;
            const isSpike = isPlayerObject && object.itemGroup === ItemGroup.SPIKE;
            const isEnemyObject = !isPlayerObject || PlayerManager.isEnemyByID(object.ownerID, enemy);
            const isDangerObjectToEnemy = isEnemyObject && (isSpike || isCactus);
            if (!isDangerObjectToEnemy) return;

            const KBDistance = 200;
            const spikeScale = object.collisionScale + enemy.collisionScale;
            const angleToSpike = pos1.angle(pos3);
            const distanceToTarget = pos2.distance(pos3);

            const distanceToSpike = pos1.distance(pos3);
            const offset = Math.asin((2 * spikeScale) / (2 * distanceToSpike));
            const angleDistance = getAngleDist(knockbackAngle, angleToSpike);

            const intersecting = angleDistance <= offset;
            const overlapping = distanceToTarget <= distanceToSpike;
            const inRange = enemy.collidingObject(object, KBDistance);

            return intersecting && overlapping && inRange;
        })
    }

    postTick(): void {
        if (!settings._autoplacer) return;
        
        const { myPlayer: myPlayer, ObjectManager, _ModuleHandler: ModuleHandler, EnemyManager } = this.client;
        const { currentType } = ModuleHandler;
        const pos0 = myPlayer.pos.current;
        
        if (ModuleHandler.placedOnce) return;
        const nearestEnemy = EnemyManager.nearestTrappedEnemy || EnemyManager.nearestEnemy;
        if (nearestEnemy === null) return;
        if (!myPlayer.collidingSimple(nearestEnemy, settings._autoplacerRadius)) return;
        
        const shouldResetAngles = (
            myPlayer.speed > 5 ||
            ObjectManager.isDestroyedObject() ||
            nearestEnemy.lastAttacked === myPlayer.tickCount
        );
        if (shouldResetAngles) this.angleList.clear();
        // const nearestAngle = currentAngle;
        const nearestAngle = pos0.angle(nearestEnemy.pos.current);

        let itemType: ItemType | null = null;
        const spike = myPlayer.getItemByType(ItemType.SPIKE);
        const spikeAngles = ObjectManager.getBestPlacementAngles({
            position: pos0,
            id: spike,
            targetAngle: nearestAngle,
            ignoreID: null,
            preplace: true,
            reduce: true,
            fill: true,
        });
        const spikeScale = Items[spike].scale;
        let angles: number[] = [];

        const length = myPlayer.getItemPlaceScale(spike);
        for (const angle of spikeAngles) {
            const newPos = pos0.addDirection(angle, length);
            let shouldPlaceSpike = nearestEnemy.wasTrapped();

            const enemy = EnemyManager.nearestTrappedEnemy;
            if (enemy !== null && !shouldPlaceSpike) {
                const distanceToEnemy = newPos.distance(enemy.pos.current);
                const enemyRange = spikeScale + enemy.collisionScale + 8;
                
                const trap = enemy.trappedIn!;
                const distanceToTrap = newPos.distance(trap.pos.current);
                const trapRange = spikeScale + trap.placementScale + 8;
                if (distanceToEnemy <= enemyRange || distanceToTrap <= trapRange) {
                    shouldPlaceSpike = true;
                }
            }

            if (!shouldPlaceSpike && this.canKnockbackSpike(newPos, spikeScale, nearestEnemy)) {
                shouldPlaceSpike = true;
            }

            if (shouldPlaceSpike) {
                angles = spikeAngles;
                itemType = ItemType.SPIKE;
                break;
            }
        }

        if (angles.length === 0) {
            let type = currentType && currentType !== ItemType.FOOD ? currentType : ItemType.TRAP;
            if (!myPlayer.canPlace(type)) return;

            let id = myPlayer.getItemByType(type)!;
            if (id === EItem.BOOST_PAD && !myPlayer.isTrapped) return;
            
            if (this.placementCount >= 3) {
                type = ItemType.SPIKE;
                id = myPlayer.getItemByType(type)!;
            }
            angles = ObjectManager.getBestPlacementAngles({
                position: pos0,
                id: id,
                targetAngle: nearestAngle,
                ignoreID: null,
                preplace: true,
                reduce: true,
                fill: type !== ItemType.SPIKE,
            });
            itemType = type;

            if (type === ItemType.SPIKE && angles.length !== 0) {
                this.placementCount = 0;
            }
        }

        if (itemType === null || angles.length === 0) return;
        ModuleHandler.placeAngles[0] = itemType;
        // ModuleHandler.placeAngles[1] = angles;

        ModuleHandler.placedOnce = true;
        for (const angle of angles) {
            if (!this.angleList.has(angle)) {
                this.angleList.set(angle, 0);
            }

            const angleCount = this.angleList.get(angle)!;
            if (angleCount >= 4) continue;
            this.angleList.set(angle, angleCount + 1);

            ModuleHandler.place(itemType, angle);
            ModuleHandler.placeAngles[1].push(angle);

            // const ping = this.client.SocketManager.pong / 2;
            // const tick = this.client.SocketManager.TICK;
            // if (ping <= tick) {
            //     const delay = Math.max(0, tick - ping);

            //     setTimeout(() => {
            //         ModuleHandler.place(itemType, angle, true);
            //     }, delay);
            // }
        }

        if (itemType !== ItemType.SPIKE) {
            this.placementCount += 1;
        }
    }
}

export default AutoPlacer;