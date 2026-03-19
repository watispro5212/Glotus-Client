import PlayerClient from "../../PlayerClient";

class ClanJoiner {
    readonly moduleName = "clanJoiner";
    private readonly client: PlayerClient;
    private joinCount = 0;

    private prevState = false;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        const { myPlayer: myPlayer, PacketManager, ownerClient: owner, PlayerManager } = this.client;
        const ownerClan = owner.myPlayer.clanName;
        const myClan = myPlayer.clanName;

        // ONCE CLAN IS CHANGED, WE SHOULD RESET IT'S JOINING STATE IN ORDER TO MAKE EVERYTHING SMOOTH
        const state = ownerClan !== myClan;
        if (this.prevState !== state) {
            this.prevState = state;

            this.joinCount = 0;
        }
        
        if (ownerClan === null || myClan === ownerClan || !PlayerManager.clanExist(ownerClan)) return;

        if (this.joinCount === 4) {
            this.joinCount = 0;

            if (myClan !== null) {
                PacketManager.leaveClan();
            } else if (!owner.pendingJoins.has(myPlayer.id)) {
                owner.pendingJoins.add(myPlayer.id);
                PacketManager.joinClan(ownerClan);
            }
            return;
        }
        this.joinCount += 1;
    }
}

export default ClanJoiner;