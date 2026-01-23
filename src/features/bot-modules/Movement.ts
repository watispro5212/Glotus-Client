import type Vector from "../../modules/Vector";
import PlayerClient from "../../PlayerClient";
import settings from "../../utility/Settings";

class Movement {
    readonly moduleName = "movement";
    private readonly client: PlayerClient;
    isStopped = true;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getMovePosition() {
        return this.client.owner.InputHandler.getMovePosition();
    }

    private circlePosition(vec: Vector) {
        const totalBots = this.client.owner.clients.size;
        if (totalBots === 0) return vec;

        const { circleOffset } = this.client.owner.ModuleHandler;
        const botIndex = this.client.owner.getClientIndex(this.client);
        const angle = (2 * Math.PI * botIndex) / totalBots + circleOffset;
        return vec.addDirection(angle, settings._circleRadius);
    }

    private getActualPosition() {
        const pos = this.getMovePosition();
        if (settings._circleFormation) {
            return this.circlePosition(pos);
        }

        return pos;
    }

    private someColliding(pos: Vector, radius: number) {
        const { myPlayer } = this.client;

        const { previous, current } = myPlayer.pos;
        return (
            previous.distance(pos) <= radius ||
            current.distance(pos) <= radius
        )
    }

    postTick(): void {
        const { InputHandler } = this.client.owner;
        const { myPlayer, ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const walkPos = this.getActualPosition();
        const lookPos = InputHandler.cursorPosition();
        // const distance = pos1.distance(walkPos);
        const lookAt = pos1.angle(lookPos);
        ModuleHandler.currentAngle = lookAt;
        
        // if (distance > settings._movementRadius) {
        if (!this.someColliding(walkPos, settings._movementRadius)) {
            const walkTo = pos1.angle(walkPos);
            this.isStopped = !ModuleHandler.startMovement(walkTo);
        } else if (!this.isStopped) {
            this.isStopped = true;
            ModuleHandler.stopMovement();
        }
    }
}

export default Movement;