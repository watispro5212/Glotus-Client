import { Hats } from "../../../constants/Store";
import type PlayerClient from "../../../PlayerClient";
import { ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AutoSync {
    readonly moduleName = "autoSync";
    private readonly client: PlayerClient;

    private useTurret = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._autoSync) {
            this.useTurret = false;
            return;
        }

        // CHECK IF TARGETS ACTUALLY EXIST
        const nearestEnemy = EnemyManager.nearestEnemy;
        const nearestEnemyToNearestEnemy = EnemyManager.nearestEnemyToNearestEnemy;
        if (nearestEnemy === null || nearestEnemyToNearestEnemy === null) return;

        const reloading = ModuleHandler.staticModules.reloading;
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);
        if (this.useTurret) {
            this.useTurret = false;
            if (turretReloaded) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.forceHat = EHat.TURRET_GEAR;
            }
            return;
        }

        // CHECK IF WEAPONS AND RELOADING SATISFIES THE CONDITIONS FOR AUTOSYNCING
        const primary1 = myPlayer.getItemByType(WeaponType.PRIMARY);
        const primaryDamage1 = myPlayer.getMaxWeaponDamage(primary1, false);
        const range1 = DataHandler.getWeapon(primary1).range + nearestEnemy.hitScale;
        const isPrimaryReloaded1 = reloading.isReloaded(ReloadType.PRIMARY);

        const primary2 = nearestEnemyToNearestEnemy.weapon.primary!;
        const primaryDamage2 = nearestEnemyToNearestEnemy.getMaxWeaponDamage(primary2, false);
        const range2 = DataHandler.getWeapon(primary2).range + nearestEnemy.hitScale;
        const isPrimaryReloaded2 = nearestEnemyToNearestEnemy.isReloaded(ReloadType.PRIMARY, 0);
        // if (!isPrimaryReloaded1 || !isPrimaryReloaded2) return;

        // Allows to use other sync combinations, such as golden katana + polearm or 2 diamond katanas
        const soldierDefense = Hats[EHat.SOLDIER_HELMET].dmgMult;
        const totalDamage = (primaryDamage1 + primaryDamage2) * soldierDefense;
        if (totalDamage < 100) return;

        // CHECK IF BOTH MYPLAYER AND ENEMY ARE WITHIN ATTACK RANGE OF NEAREST ENEMY
        const inWeaponRange1 = myPlayer.collidingSimple(nearestEnemy, range1, myPlayer.getFuturePosition(myPlayer.speed / 3));
        const inWeaponRange2 = nearestEnemyToNearestEnemy.collidingSimple(nearestEnemy, range2, nearestEnemyToNearestEnemy.getFuturePosition(nearestEnemyToNearestEnemy.speed / 3));
        if (!inWeaponRange1 || !inWeaponRange2) return;

        const pos1 = myPlayer.pos.future;
        const pos2 = nearestEnemy.pos.future;
        const angleToEnemy = pos1.angle(pos2);
        
        // IF OUR WEAPON IS NOT RELOADED YET, THEN PRELOAD
        if (!isPrimaryReloaded1) {
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;

            if (isPrimaryReloaded2) {
                ModuleHandler.moduleActive = true;
            }
        }

        // ACTIVATION
        if (isPrimaryReloaded1 && isPrimaryReloaded2) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angleToEnemy;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;
            this.useTurret = true;

            this.client.StatsManager.autoSyncTimes = 1;
        }
    }
}