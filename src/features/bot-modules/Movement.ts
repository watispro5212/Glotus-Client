import type Vector from "../../modules/Vector";
import PlayerClient from "../../PlayerClient";
import settings from "../../utility/Settings";

class Movement {
    readonly moduleName = "movement";
    private readonly client: PlayerClient;
    private isStopped = true;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getMovePosition() {
        return this.client.ownerClient.InputHandler.getMovePosition();
    }

    private circlePosition(vec: Vector) {
        const totalBots = this.client.ownerClient.clients.size;
        if (totalBots === 0) return vec;

        const { circleOffset } = this.client.ownerClient._ModuleHandler;
        const botIndex = this.client.ownerClient.getClientIndex(this.client);
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
        const { previous, current } = this.client.myPlayer.pos;
        return (
            previous.distance(pos) <= radius ||
            current.distance(pos) <= radius
        )
    }

    postTick(): void {
        const { InputHandler } = this.client.ownerClient;
        const { myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const walkPos = this.getActualPosition();
        const lookPos = InputHandler.cursorPosition();
        const lookAt = pos1.angle(lookPos);
        ModuleHandler._currentAngle = lookAt;
        
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