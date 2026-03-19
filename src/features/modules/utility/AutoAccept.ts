import type PlayerClient from "../../../PlayerClient";
import GameUI from "../../../UI/GameUI";
import settings from "../../../utility/Settings";

class AutoAccept {
    readonly moduleName = "autoAccept";
    private readonly client: PlayerClient;

    private prevClan: string | null = null;
    private acceptCount = 0;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        
        const { myPlayer: myPlayer, clientIDList, PacketManager, isOwner } = this.client;

        // ONCE CLAN IS CHANGED, RESET ALL REQUESTS
        const currentClan = myPlayer.clanName;
        if (currentClan !== this.prevClan) {
            this.prevClan = currentClan;
            myPlayer.joinRequests.length = 0;
            this.client.pendingJoins.clear();
        }

        this.acceptCount = (this.acceptCount + 1) % 3;
        if (!myPlayer.isLeader || myPlayer.joinRequests.length === 0 || this.acceptCount !== 0) return;
        
        const id = myPlayer.joinRequests[0]![0];
        if (settings._autoaccept || this.client.pendingJoins.size !== 0) {
            PacketManager.clanRequest(id, settings._autoaccept || clientIDList.has(id));
            myPlayer.joinRequests.shift();
            this.client.pendingJoins.delete(id);
            if (isOwner) GameUI.clearNotication();
        }

        const nextID = myPlayer.joinRequests[0];
        if (isOwner && nextID !== undefined) {
            GameUI.createRequest(nextID);
        }
    }
}

export default AutoAccept;