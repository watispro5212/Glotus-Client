import type Player from "../../data/Player";
import PlayerClient from "../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../types/Items";
import { EHat } from "../../types/Store";
import DataHandler from "../../utility/DataHandler";
import settings from "../../utility/Settings";

class SpikeTick {
    readonly moduleName = "spikeTick";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._spikeTick) {
            this.targetEnemy = null;
            return;
        }

        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isPrimary = primary !== EWeapon.STICK;
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY, 1);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        if (this.targetEnemy !== null) {
            const pos1 = myPlayer.pos.future;
            const pos2 = this.targetEnemy.pos.future;
            const angle = pos1.angle(pos2);
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            this.targetEnemy = null;
            return;
        }

        const nearest = EnemyManager.enemySpikeCollider;
        if (nearest !== null && isPrimary && primaryReloaded && turretReloaded) {
            const weaponRange = DataHandler.getWeapon(primary).range;
            const range = weaponRange + nearest.hitScale;

            if (myPlayer.collidingSimple(nearest, range)) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
                this.targetEnemy = nearest;

                this.client.StatsManager.spikeTickTimes += 1;
            }
        }
    }
}

export default SpikeTick;