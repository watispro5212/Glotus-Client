import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import { toRadians } from "../../../utility/Common";

export default class TeammateSpikeTrap {
    readonly moduleName = "teammateSpikeTrap";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, InputHandler, PlayerManager, myPlayer: myPlayer, PacketManager } = this.client;
        if (ModuleHandler.moduleActive) return;

        if (!InputHandler.instaToggle) {
            InputHandler.instaReset();
            return;
        }

        const nearestTeammate = PlayerManager.nearestTeammate;
        if (!nearestTeammate) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestTeammate.pos.current;
        const distance = pos1.distance(pos2);
        const angle = pos1.angle(pos2);
        if (distance > 500) return;
        InputHandler.instakillTarget = nearestTeammate;
        if (distance > 175) return;

        const angles = [
            angle,
            angle - toRadians(90),
            angle + toRadians(90),
            angle + toRadians(180),
        ];

        const id = myPlayer.getItemByType(ItemType.SPIKE)!;
        const current = myPlayer.getPlacePosition(pos1, id, angle);
        const distance2 = current.distance(pos1);
        ModuleHandler.placeAngles[0] = ItemType.SPIKE;
        ModuleHandler.placeAngles[1] = angles;
        if (
            distance > distance2 ||
            !angles.every(angle => myPlayer.canPlaceObject(ItemType.SPIKE, angle))
        ) return;
        
        InputHandler.instaReset();
        PacketManager.leaveClan();

        for (const angle of angles) {
            ModuleHandler.place(ItemType.SPIKE, angle);
        }
    }
}