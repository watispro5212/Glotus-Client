import { Items } from "../../../constants/Items";
import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import settings from "../../../utility/Settings";

class Automill {
    readonly moduleName = "autoMill";
    /** true, if module is enabled */
    private toggle = false;
    private active = true;

    private readonly client: PlayerClient;
    tickCount = 0;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    get isActive() {
        return this.toggle && this.active;
    }

    reset() {
        this.active = true;
    }

    private get canAutomill() {
        const isOwner = this.client.isOwner;
        const { attacking, placedOnce, staticModules } = this.client._ModuleHandler;
        return (
            settings._automill &&
            this.client.myPlayer.isSandbox &&
            !placedOnce &&
            (!isOwner || !attacking) &&
            this.active &&
            !staticModules.autoBuy.boughtEverything() &&
            this.client.myPlayer.age < 20
        )
    }

    private canPlaceWindmill(angle: number): boolean {
        return this.client.myPlayer.canPlaceObject(ItemType.WINDMILL, angle);
    }

    private placeWindmill(angle: number) {
        const { _ModuleHandler: ModuleHandler } = this.client;
        const type = ItemType.WINDMILL;
        ModuleHandler.place(type, angle);
        ModuleHandler.placedOnce = true;

        ModuleHandler.placeAngles[0] = type;
        ModuleHandler.placeAngles[1].push(angle);
    }

    postTick(): void {
        const { myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;
        this.toggle = true;

        if (!this.canAutomill) {
            this.toggle = false;
            return;
        }

        if (!myPlayer.canPlace(ItemType.WINDMILL)) {
            this.toggle = false;
            this.active = false;
            return;
        }

        const angle = ModuleHandler.reverse_move_dir;
        if (angle === null) return;

        const item = Items[myPlayer.getItemByType(ItemType.WINDMILL)];
        const distance = myPlayer.getItemPlaceScale(item.id);
        const offset = Math.asin((2 * item.scale + 9e-13) / (2 * distance)) * 2;
        const leftAngle = angle - offset;
        const rightAngle = angle + offset;
        if (
            this.canPlaceWindmill(angle) &&
            this.canPlaceWindmill(leftAngle) &&
            this.canPlaceWindmill(rightAngle)
        ) {
            this.placeWindmill(angle);
            this.placeWindmill(leftAngle);
            this.placeWindmill(rightAngle);
        }
    }
}

export default Automill;