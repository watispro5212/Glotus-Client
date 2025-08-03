import PlayerClient from "../../PlayerClient";
import { ItemType } from "../../types/Items";

class Placer {
    readonly moduleName = "placer";
    private readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        const { ModuleHandler, myPlayer } = this.client;
        const { currentType, placedOnce, healedOnce, currentAngle } = ModuleHandler;
        if (!myPlayer.canPlace(currentType)) return;

        if (currentType === ItemType.FOOD) {
            if (healedOnce) return;
            ModuleHandler.heal();
            ModuleHandler.healedOnce = true;
            return;
        }
        
        if (placedOnce) return;
        ModuleHandler.place(currentType, currentAngle);
        ModuleHandler.placedOnce = true;
    }
}

export default Placer;