import type Vector from "../../modules/Vector";
import PlayerClient from "../../PlayerClient";
import { toRadians } from "../../utility/Common";
import settings from "../../utility/Settings";

class Movement {
    readonly moduleName = "movement";
    private readonly client: PlayerClient;
    isStopped = true;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getPosition() {
        const { ModuleHandler } = this.client;
        if (settings._followCursor) {
            return ModuleHandler.lookTarget;
        }
        return ModuleHandler.followTarget;
    }

    private getActualPosition() {
        const { myPlayer, InputHandler } = this.client.owner;
        if (settings._followCursor) {
            return InputHandler.cursorPosition();
        }
        return myPlayer.pos.future;
    }

    // private circlePosition(vec: Vector) {
    //     const totalBots = this.client.owner.clients.size;
    //     if (totalBots === 0) return vec;

    //     const { circleOffset, circleRadius } = this.client.owner.ModuleHandler;
    //     const botIndex = this.client.owner.getClientIndex(this.client);
    //     const angle = (2 * Math.PI * botIndex) / totalBots + circleOffset;
    //     return vec.addDirection(angle, circleRadius);
    // }

    postTick(): void {
        const { InputHandler } = this.client.owner;
        const { myPlayer, ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const walkPos = this.getActualPosition();
        // const orig = this.getActualPosition();
        // const walkPos = this.circlePosition(orig);
        // const lookPos = ModuleHandler.lookTarget;
        const lookPos = InputHandler.cursorPosition();
        const distance = pos1.distance(walkPos);
        const walkTo = pos1.angle(walkPos);
        const lookAt = pos1.angle(lookPos);
        ModuleHandler.currentAngle = lookAt;

        // if (distance > 130) {
        if (distance > 65) {
            this.isStopped = !ModuleHandler.startMovement(walkTo);
        } else if (!this.isStopped) {
            this.isStopped = true;
            ModuleHandler.stopMovement();
        }
    }
}

export default Movement;