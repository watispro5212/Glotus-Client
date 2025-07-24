import { Items } from "../../constants/Items";
import PlayerClient from "../../PlayerClient";
import { ItemType } from "../../types/Items";
import settings from "../../utility/Settings";

class Automill {
    readonly moduleName = "autoMill";
    /** true, if module is enabled */
    toggle = true;

    private readonly client: PlayerClient;
    tickCount = 0;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    reset() {
        this.toggle = true;
    }

    private get canAutomill() {
        const isOwner = this.client.isOwner;
        const { attacking, placedOnce } = this.client.ModuleHandler;
        return (
            settings._automill &&
            this.client.myPlayer.isSandbox &&
            !placedOnce &&
            // !autoattack &&
            (!isOwner || !attacking) &&
            this.toggle
        )
    }

    private placeWindmill(angle: number): boolean {
        const { myPlayer, ObjectManager, ModuleHandler, isOwner } = this.client;
        const id = myPlayer.getItemByType(ItemType.WINDMILL)!;
        const position = myPlayer.getPlacePosition(myPlayer.pos.future, id, angle);
        const radius = isOwner ? 0 : Items[id].scale;
        if (!ObjectManager.canPlaceItem(id, position, radius)) return false;
        // if (ModuleHandler.totalPlaces >= 5) return;
        // ModuleHandler.totalPlaces += 1;

        const type = ItemType.WINDMILL;
        ModuleHandler.place(type, angle);
        ModuleHandler.placedOnce = true;
        return true;
    }

    postTick(): void {
        const { myPlayer, ModuleHandler } = this.client;

        if (!this.canAutomill) return;
        if (!myPlayer.canPlace(ItemType.WINDMILL)) {
            this.toggle = false;
            return;
        }

        const angle = ModuleHandler.reverse_move_dir;
        if (angle === null) return;

        const item = Items[myPlayer.getItemByType(ItemType.WINDMILL)];
        const distance = myPlayer.getItemPlaceScale(item.id);
        const angleBetween = Math.asin((2 * item.scale + 15) / (2 * distance)) * 2;

        if (this.tickCount === 0) {
            this.placeWindmill(angle);
            this.placeWindmill(angle - angleBetween);
            this.placeWindmill(angle + angleBetween);
        }
        this.tickCount = (this.tickCount + 1) % 3;
    }
}

export default Automill;