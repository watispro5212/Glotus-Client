import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EWeapon, ReloadType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";

export default class ReverseInstakill {
    readonly moduleName = "reverseInstakill";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    reset() {
        this.targetEnemy = null;
    }

    postTick() {
        const { myPlayer: myPlayer, EnemyManager, PlayerManager, _ModuleHandler: ModuleHandler, InputHandler } = this.client;
        if (!InputHandler.instaToggle) {
            this.reset();
            InputHandler.instaReset();
            return;
        }

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null) return;

        const lookingShield = PlayerManager.lookingShield(nearestEnemy, myPlayer);
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const primaryDamage = myPlayer.getMaxWeaponDamage(primary, lookingShield);
        
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        if (secondary !== EWeapon.GREAT_HAMMER) return;
        const secondaryDamage = myPlayer.getMaxWeaponDamage(secondary, lookingShield);
        const totalDamage = primaryDamage + secondaryDamage + 25;
        if (totalDamage < 100) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = nearestEnemy.pos.current;
        const angle = pos1.angle(pos2);

        if (this.targetEnemy !== null) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = angle;
            ModuleHandler.forceHat = EHat.BULL_HELMET;
            ModuleHandler.forceWeapon = WeaponType.PRIMARY;
            ModuleHandler.shouldAttack = true;

            this.targetEnemy = null;
            InputHandler.instaReset();

            EnemyManager.attemptSpikePlacement();
            return;
        }

        InputHandler.instakillTarget = nearestEnemy;
        const { reloading } = ModuleHandler.staticModules;
        const primaryReloaded = reloading.isReloaded(WeaponType.PRIMARY, 1);
        const secondaryReloaded = reloading.isReloaded(WeaponType.SECONDARY);
        const turretReloaded = reloading.isReloaded(ReloadType.TURRET);
        const range = DataHandler.getWeapon(primary).range + nearestEnemy.hitScale;
        if (
            !primaryReloaded ||
            !secondaryReloaded ||
            !turretReloaded ||
            !myPlayer.collidingSimple(nearestEnemy, range)
        ) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.TURRET_GEAR;
        ModuleHandler.forceWeapon = WeaponType.SECONDARY;
        ModuleHandler.shouldAttack = true;
        this.targetEnemy = nearestEnemy;
    }
}