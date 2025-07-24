import PlayerClient from "../../PlayerClient";
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

    postTick(): void {
        const { InputHandler } = this.client.owner;
        const { myPlayer, ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const walkPos = this.getActualPosition();
        // const lookPos = ModuleHandler.lookTarget;
        const lookPos = InputHandler.cursorPosition();
        const distance = pos1.distance(walkPos);
        const walkTo = pos1.angle(walkPos);
        const lookAt = pos1.angle(lookPos);
        ModuleHandler.currentAngle = lookAt;

        // It is completely dumb to move only towards owner. It MUST use pathfinder, but I am too lazy to implement this nonsense
        if (distance > 130) {
            this.isStopped = !ModuleHandler.startMovement(walkTo);
        } else if (!this.isStopped) {
            this.isStopped = true;
            ModuleHandler.stopMovement();
        }
    }
}

export default Movement;