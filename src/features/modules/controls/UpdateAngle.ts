import PlayerClient from "../../../PlayerClient";
import { ESentAngle } from "../../../types/Enums";

class UpdateAngle {
    readonly moduleName = "updateAngle";
    private readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        
        const { sentAngle, _currentAngle: currentAngle } = this.client._ModuleHandler;
        if (sentAngle > ESentAngle.LOW) return;

        this.client._ModuleHandler.updateAngle(currentAngle);
    }
}

export default UpdateAngle;