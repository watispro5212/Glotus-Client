import Vector from "../../../modules/Vector";
import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import { lineIntersectsRect } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class PlacementDefense {
    readonly moduleName = "placementDefense";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { EnemyManager, myPlayer: myPlayer, _ModuleHandler: ModuleHandler, ProjectileManager, ObjectManager } = this.client;
        
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null || !settings._placementDefense) return;

        const shouldDefend = EnemyManager.rangedBowInsta;

        if (shouldDefend || ProjectileManager.totalDamage >= myPlayer.currentHealth) {
            const pos1 = myPlayer.pos.current;
            const pos2 = nearestEnemy.pos.current;
            const angle = pos1.angle(pos2);

            let type = ItemType.WALL;
            if (myPlayer.canPlace(ItemType.WINDMILL)) {
                type = ItemType.WINDMILL;
            }

            const id = myPlayer.getItemByType(type);
            const length = myPlayer.getItemPlaceScale(id);
            const angles = ObjectManager.getBestPlacementAngles({
                position: pos1,
                id: id,
                targetAngle: angle,
                ignoreID: null,
                preplace: false,
                reduce: true,
                fill: false,
            });

            if (angles.length === 0) return;

            const distance1 = pos1.distance(pos2);
            const placementScale = DataHandler.getItem(id).scale;
            for (const angle of angles) {
                const pos3 = pos1.addDirection(angle, length);
                const rectStart = pos3.copy().sub(placementScale);
                const rectEnd = pos3.copy().add(placementScale);
                const distance2 = pos3.distance(pos2);

                if (distance2 < distance1 && lineIntersectsRect(pos2, pos1, rectStart, rectEnd)) {
                    ModuleHandler.place(type, angle);
                }
            }
            ModuleHandler.placedOnce = true;

            ModuleHandler.placeAngles[0] = type;
            ModuleHandler.placeAngles[1] = [angle];
        }
    }
}