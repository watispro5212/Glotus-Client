import { Items } from "../../../constants/Items";
import type PlayerClient from "../../../PlayerClient";
import { ItemType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import { clamp } from "../../../utility/Common";
import settings from "../../../utility/Settings";

class AntiInsta {
    readonly moduleName = "antiInsta";
    private readonly client: PlayerClient;
    private toggleAnti = false;

    private healingCount = 0;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private isSaveHealTime(): boolean {
        const { myPlayer, SocketManager } = this.client;

        const startHit = myPlayer.receivedDamage || 0;
        const timeSinceHit = Date.now() - startHit + SocketManager.pong;
        return timeSinceHit >= 125;
    }

    private isSaveHealTick(): boolean {
        const { tickCount, damageTick } = this.client.myPlayer;
        return (tickCount - damageTick) > 0;
    }

    private isSaveHeal() {
        return this.isSaveHealTime();
        // return this.isSaveHealTick() || this.isSaveHealTime();
    }

    postTick(): void {
        if (!settings._autoheal) return;

        const { myPlayer, ModuleHandler, EnemyManager, ProjectileManager } = this.client;
        if (myPlayer.shameActive) return;

        const foodID = myPlayer.getItemByType(ItemType.FOOD);
        const restore = Items[foodID].restore;

        const needTimes = Math.ceil((myPlayer.maxHealth - myPlayer.tempHealth) / restore);
        let healingTimes: number | null = null;
        
        let forceHeal = false;
        if (
            EnemyManager.velocityTickThreat ||
            EnemyManager.reverseInsta ||
            EnemyManager.rangedBowInsta ||
            EnemyManager.detectedDangerEnemy ||
            EnemyManager.detectedEnemy ||
            myPlayer.tempHealth <= 20 ||
            ModuleHandler.shouldEquipSoldier && ModuleHandler.forceHat !== EHat.SOLDIER_HELMET ||
            EnemyManager.dangerWithoutSoldier
        ) {
            forceHeal = true;
        }

        if (myPlayer.shameCount < 7 && forceHeal && myPlayer.tempHealth < 95) {
            ModuleHandler.didAntiInsta = true;
            healingTimes = needTimes || 1;
        } else if (this.isSaveHeal() && myPlayer.tempHealth < 100) {
            healingTimes = needTimes || 1;
        }

        if (healingTimes !== null) {
            // myPlayer.tempHealth = clamp(myPlayer.tempHealth + restore * healingTimes, 0, 100);

            ModuleHandler.healedOnce = true;
            for (let i=0;i<=healingTimes;i++) {
                ModuleHandler.heal();
            }
        }
    }
}

export default AntiInsta;