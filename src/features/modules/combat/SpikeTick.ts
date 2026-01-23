import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

class SpikeTick {
    readonly moduleName = "spikeTick";
    private readonly client: PlayerClient;

    // private targetEnemy: Player | null = null;
    private useTurret = false;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick(): void {
        const { ModuleHandler, EnemyManager, myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._spikeTick) {
            // this.targetEnemy = null;
            return;
        }

        const reloading = ModuleHandler.staticModules.reloading;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isPrimary = primary !== EWeapon.STICK;
        const primaryReloaded = reloading.isReloaded(ReloadType.PRIMARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);

        const spikeCollider = EnemyManager.enemySpikeCollider;
        if (this.useTurret) {
            this.useTurret = false;

            if (turretReloaded) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
                return;
            }
        }

        if (
            EnemyManager.shouldIgnoreModule() ||
            !isPrimary ||
            !primaryReloaded ||
            spikeCollider === null/*  ||
            spikeCollider.futureHat === EHat.SOLDIER_HELMET && !spikeCollider.isTrapped */
        ) return;

        // console.log(spikeCollider.futureHat);
        const weaponRange = DataHandler.getWeapon(primary).range;
        const range = weaponRange + spikeCollider.hitScale;
        if (!myPlayer.collidingEntity(spikeCollider, range, true)) return;

        const pos1 = myPlayer.pos.future;
        const pos2 = spikeCollider.pos.future;
        const angle = pos1.angle(pos2);
        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.BULL_HELMET;
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
        EnemyManager.attemptSpikePlacement();
        this.useTurret = true;
        this.client.StatsManager.spikeTickTimes = 1;
        // if (this.targetEnemy !== null) {
        //     const pos1 = myPlayer.pos.future;
        //     const pos2 = this.targetEnemy.pos.future;
        //     const angle = pos1.angle(pos2);
        //     ModuleHandler.moduleActive = true;
        //     ModuleHandler.useAngle = angle;
        //     ModuleHandler.forceHat = EHat.BULL_HELMET;
        //     ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        //     ModuleHandler.shouldAttack = true;
        //     this.targetEnemy = null;

        //     EnemyManager.attemptSpikePlacement();
        //     return;
        // }

        // const spikeCollider = EnemyManager.enemySpikeCollider;
        // if (!EnemyManager.shouldIgnoreModule() && spikeCollider !== null && isPrimary && primaryReloaded && turretReloaded) {
        //     const weaponRange = DataHandler.getWeapon(primary).range;
        //     const range = weaponRange + spikeCollider.hitScale;

        //     if (!myPlayer.collidingEntity(spikeCollider, range, true)) return;
        //     ModuleHandler.moduleActive = true;
        //     ModuleHandler.forceHat = EHat.TURRET_GEAR;
        //     this.targetEnemy = spikeCollider;

        //     this.client.StatsManager.spikeTickTimes += 1;
        // }
    }
}

export default SpikeTick;