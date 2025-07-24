import { Items } from "../../constants/Items";
import PlayerClient from "../../PlayerClient";
import { ItemType } from "../../types/Items";
import settings from "../../utility/Settings";

class AutoPlacer {
    readonly moduleName = "autoPlacer";
    private readonly client: PlayerClient;

    placeAngles: [Exclude<ItemType, ItemType.FOOD> | null, number[]] = [null, []];

    private placementCount = 0;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        this.placeAngles[0] = null;
        this.placeAngles[1].length = 0;

        if (!settings._autoplacer) return;
        
        const { myPlayer, ObjectManager, ModuleHandler, EnemyManager } = this.client;
        const { currentType, currentAngle } = ModuleHandler;
        const pos = myPlayer.pos.current;
        
        if (ModuleHandler.placedOnce) return;
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null) return;
        if (!myPlayer.collidingSimple(nearestEnemy, 300)) return;

        const nearestAngle = pos.angle(nearestEnemy.pos.current);
        // const nearestAngle = currentAngle;

        let itemType: ItemType | null = null;
        const spike = myPlayer.getItemByType(ItemType.SPIKE);
        const spikeAngles = ObjectManager.getBestPlacementAngles(pos, spike, nearestAngle);

        let angles: number[] = [];

        const length = myPlayer.getItemPlaceScale(spike);
        for (const angle of spikeAngles) {
            const newPos = pos.addDirection(angle, length);
            let shouldPlaceSpike = false;

            for (const enemy of EnemyManager.trappedEnemies) {
                const distance = newPos.distance(enemy.pos.current);
                const range = Items[spike].scale * 2 + enemy.collisionScale;
                if (distance <= range) {
                    shouldPlaceSpike = true;
                    break;
                }
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

            if (this.placementCount >= 4) {
                type = ItemType.SPIKE;
            }
            const id = myPlayer.getItemByType(type)!;
            angles = ObjectManager.getBestPlacementAngles(pos, id, nearestAngle);
            itemType = type;

            if (type === ItemType.SPIKE && angles.length !== 0) {
                this.placementCount = 0;
            }
        }

        if (itemType === null) return;
        this.placeAngles[0] = itemType;
        this.placeAngles[1] = angles;

        // console.log(angles.length);
        if (angles.length === 0) return;
        if (ModuleHandler.didAntiInsta) {
            angles.length = 1;
        }
        ModuleHandler.placedOnce = true;
        for (const angle of angles) {
            ModuleHandler.place(itemType, angle);
        }

        if (itemType === ItemType.TRAP) {
            this.placementCount += 1;
        }
    }
}

export default AutoPlacer;