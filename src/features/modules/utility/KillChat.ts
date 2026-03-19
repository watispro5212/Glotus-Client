import type PlayerClient from "../../../PlayerClient";
import settings from "../../../utility/Settings";

export default class KillChat {
    readonly moduleName = "killChat";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { myPlayer: myPlayer, PacketManager } = this.client;
        if (!settings._killMessage || !myPlayer.killedSomeone || myPlayer.resources.kills === 0) return;
        
        const message = (settings._killMessageText || "").trim();
        if (message.length === 0) return;
        PacketManager.chat(message);
    }
}