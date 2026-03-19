import type PlayerClient from "../../../PlayerClient";
import { ReloadType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import settings from "../../../utility/Settings";

export default class TurretSteal {
    readonly moduleName = "turretSteal";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer, EnemyManager } = this.client;
        if (ModuleHandler.moduleActive || !settings._turretSteal) return;

        const nearestEnemy = EnemyManager.nearestTurretEntity;
        if (
            nearestEnemy === null ||
            nearestEnemy.currentHealth > 25 ||
            !ModuleHandler.canBuy(EStoreType.HAT, EHat.TURRET_GEAR)
        ) return;

        const pos0 = myPlayer.pos.current;
        const pos1 = nearestEnemy.pos.current;
        const distance = pos0.distance(pos1);
        if (distance > 700) return;

        const { reloading } = ModuleHandler.staticModules;
        if (!reloading.isReloaded(ReloadType.TURRET)) return;
        ModuleHandler.moduleActive = true;
        ModuleHandler.forceHat = EHat.TURRET_GEAR;
    }
}