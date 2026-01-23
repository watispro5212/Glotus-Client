import type Player from "../../../data/Player";
import type PlayerClient from "../../../PlayerClient";
import { EItem, EWeapon, ItemType, ReloadType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import { inRange, reverseAngle, toRadians } from "../../../utility/Common";

export default class BowInsta {
    readonly moduleName = "bowInsta";
    private readonly client: PlayerClient;

    private targetEnemy: Player | null = null;
    private tickAction = 0;

    readonly distMin = 660;
    readonly distMax = 700;
    active = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    reset() {
        this.targetEnemy = null;
        this.tickAction = 0;
        this.active = false;
    }

    postTick() {
        const { EnemyManager, ModuleHandler, myPlayer, InputHandler } = this.client;
        if (!InputHandler.instaToggle) {
            this.reset();
            InputHandler.instaReset();
            return;
        }

        // GET NEAREST ENEMY
        // IF IT DOESNT EXIST (potentially dead), THEN RESET AND IGNORE
        const nearestEnemy = EnemyManager.nearestEnemy;
        const nearest = this.targetEnemy || nearestEnemy;
        if (nearest === null) {
            this.reset();
            return;
        }
        
        const pos1 = myPlayer.pos.current;
        const pos2 = nearest.pos.current;
        const angle = pos1.angle(pos2);
        const distance = pos1.distance(pos2);
        
        InputHandler.instakillTarget = nearest;
        if (this.targetEnemy !== null) {

            if (this.tickAction === 2) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.useAngle = angle;
                ModuleHandler.forceWeapon = WeaponType.SECONDARY;
                ModuleHandler.shouldAttack = true;
                ModuleHandler.moveTo = null;
                ModuleHandler.upgradeItem(EWeapon.MUSKET);
                
                this.reset();
                InputHandler.instaReset();
                return;
            }

            if (this.tickAction === 1) {
                ModuleHandler.moduleActive = true;
                ModuleHandler.useAngle = angle;
                ModuleHandler.forceWeapon = WeaponType.SECONDARY;
                ModuleHandler.shouldAttack = true;
                ModuleHandler.moveTo = null;
                ModuleHandler.upgradeItem(EWeapon.CROSSBOW);
                this.tickAction = 2;
                return;
            }

            return;
        }

        // CHECK IF WE ARE AT THE RIGHT UPGRADING
        // WE MUST HAVE BOW PREPARED, BUT ALSO ENOUGH AGE FOR MUSKET
        const isUpgradeAge = inRange(myPlayer.upgradeAge, 6, 8) && myPlayer.age >= 9;
        if (!isUpgradeAge) return;

        this.active = true;
        // MAKE SURE WE CAN ACTUALLY EQUIP TURRET AND IT WILL SHOOT
        const { reloading } = ModuleHandler.staticModules;
        const useTurret = ModuleHandler.canBuy(EStoreType.HAT, EHat.TURRET_GEAR);
        if (
            !useTurret ||
            !reloading.isReloaded(ReloadType.TURRET) ||
            !inRange(distance, this.distMin, this.distMax)
        ) return;

        ModuleHandler.moveTo = null;
        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        ModuleHandler.forceHat = EHat.TURRET_GEAR;
        ModuleHandler.forceWeapon = WeaponType.SECONDARY;
        ModuleHandler.shouldAttack = true;
        if (myPlayer.upgradeAge === 6) ModuleHandler.upgradeItem(EWeapon.HUNTING_BOW);
        if (myPlayer.upgradeAge === 7) ModuleHandler.upgradeItem(EItem.PLATFORM, true);
        if (myPlayer.upgradeAge === 8 && myPlayer.getItemByType(ItemType.TURRET) === EItem.PLATFORM) {
            ModuleHandler.place(ItemType.TURRET, angle);
            ModuleHandler.place(ItemType.TURRET, angle - toRadians(90));
            ModuleHandler.place(ItemType.TURRET, angle + toRadians(90));
            ModuleHandler.place(ItemType.TURRET, reverseAngle(angle));
        }

        this.tickAction = 1;
        this.targetEnemy = nearestEnemy;
    }
}