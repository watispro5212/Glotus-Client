import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import settings from "../../../utility/Settings";

export default class PlacementDefense {
    readonly moduleName = "placementDefense";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { EnemyManager, myPlayer, ModuleHandler, ProjectileManager } = this.client;
        
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
            ModuleHandler.place(type, angle);
            ModuleHandler.placedOnce = true;

            ModuleHandler.placeAngles[0] = type;
            ModuleHandler.placeAngles[1] = [angle];
        }
    }
}