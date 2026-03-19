import type PlayerClient from "../../../PlayerClient";
import { EItem, ItemType } from "../../../types/Items";
import { toRadians } from "../../../utility/Common";

export default class SpikeTrap {
    readonly moduleName = "spikeTrap";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer, EnemyManager } = this.client;
        if (ModuleHandler.moduleActive) return;

        const trapId = myPlayer.getItemByType(ItemType.TRAP);
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (!nearestEnemy || myPlayer.isTrapped || trapId !== EItem.BOOST_PAD) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const distance = pos1.distance(pos2);
        const angle = pos1.angle(pos2);
        if (distance > 175) return;

        const angles = [
            angle,
            angle - toRadians(90),
            angle + toRadians(90),
            angle + toRadians(180),
        ];

        const id = myPlayer.getItemByType(ItemType.SPIKE)!;

        const len = ModuleHandler.currentType === ItemType.TRAP ? 30 : 0;
        const current = myPlayer.getPlacePosition(pos1, id, angle);
        const distance2 = current.distance(pos1) + len;
        ModuleHandler.placeAngles[0] = ItemType.SPIKE;
        ModuleHandler.placeAngles[1] = angles;
        if (distance > distance2) return;

        for (const angle of angles) {
            ModuleHandler.place(ItemType.SPIKE, angle);
        }
    }
}