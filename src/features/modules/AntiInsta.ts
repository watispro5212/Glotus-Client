import { Items } from "../../constants/Items";
import PlayerClient from "../../PlayerClient";
import { ItemType } from "../../types/Items";
import GameUI from "../../UI/GameUI";
import { clamp } from "../../utility/Common";
import settings from "../../utility/Settings";

class AntiInsta {
    readonly moduleName = "antiInsta";
    private readonly client: PlayerClient;
    private toggleAnti = false;

    private healingCount = 0;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private get isSaveHeal(): boolean {
        const { myPlayer, SocketManager } = this.client;

        const startHit = myPlayer.receivedDamage || 0;
        const timeSinceHit = Date.now() - startHit + SocketManager.pong;
        return timeSinceHit >= 120;
    }

    private get canHeal() {
        const { myPlayer } = this.client;
        return (
            myPlayer.tempHealth < 100 &&
            !myPlayer.shameActive &&
            this.isSaveHeal
        )
    }

    postTick(): void {
        if (!settings._autoheal) return;

        const { myPlayer, ModuleHandler, isOwner } = this.client;

        const foodID = myPlayer.getItemByType(ItemType.FOOD);
        const restore = Items[foodID].restore;
        const maxTimes = Math.ceil(myPlayer.maxHealth / restore);
        const needTimes = Math.ceil((myPlayer.maxHealth - myPlayer.tempHealth) / restore);
        let healingTimes: number | null = null;

        // AntiInsta implementation
        if (ModuleHandler.needToHeal || this.toggleAnti) {
            ModuleHandler.needToHeal = false;
            if (myPlayer.shameActive) return;

            ModuleHandler.didAntiInsta = true;
            healingTimes = 1;//Math.min(maxTimes, 3);
        } else if (this.canHeal) {
            healingTimes = needTimes;
            myPlayer.tempHealth += clamp(restore * healingTimes, 0, 100);
        }

        if (healingTimes !== null) {
            ModuleHandler.healedOnce = true;
            for (let i=0;i<=healingTimes;i++) {
                ModuleHandler.heal();
            }
        }
    }
}

export default AntiInsta;