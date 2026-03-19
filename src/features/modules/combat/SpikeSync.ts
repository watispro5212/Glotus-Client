import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class SpikeSync {
    readonly moduleName = "spikeSync";
    private readonly client: PlayerClient;

    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._spikeSync) {
            this.useTurret = false;
            return;
        }

        const nearest = EnemyManager.nearestEnemy;
        const placementAngles = EnemyManager.nearestSpikePlacerAngle;
        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isPolearm = primary !== EWeapon.STICK;
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        if (this.useTurret) {
            this.useTurret = false;
            if (turretReloaded && !EnemyManager.shouldIgnoreModule()) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            return;
        }

        if (
            !EnemyManager.shouldIgnoreModule() &&
            nearest !== null &&
            EnemyManager.canSpikeSync &&
            placementAngles !== null &&
            isPolearm &&
            primaryReloaded &&
            !ModuleHandler.staticModules.shameSpam.wasActive
        ) {
            const spear = DataHandler.getWeapon(primary);
            const range = spear.range + nearest.hitScale;
            const canAttack = myPlayer.collidingSimple(nearest, range);
            if (!canAttack) return;

            const pos1 = myPlayer.pos.current;
            const pos2 = nearest.pos.current;
            const angleTo = pos1.angle(pos2);
    
            const itemType = ItemType.SPIKE;
            for (const angle of placementAngles) {
                ModuleHandler.place(itemType, angle);
            }
            ModuleHandler.placedOnce = true;
            ModuleHandler.placeAngles[0] = itemType;
            ModuleHandler.placeAngles[1] = placementAngles;

            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angleTo;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;

            this.client.StatsManager.spikeSyncTimes = 1;
            this.useTurret = true;
        }
    }
}