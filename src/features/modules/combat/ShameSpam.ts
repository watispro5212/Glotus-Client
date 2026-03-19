import type PlayerClient from "../../../PlayerClient";
import { EItem, EWeapon, ItemType, WeaponType } from "../../../types/Items";
import { EHat } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class ShameSpam {
    readonly moduleName = "shameSpam";
    private readonly client: PlayerClient;
    private prevActive = false;
    private active = false;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    get wasActive() {
        return this.prevActive;
    }

    postTick() {
        this.prevActive = this.active;
        this.active = false;

        const { myPlayer: myPlayer, EnemyManager, _ModuleHandler: ModuleHandler, ObjectManager } = this.client;
        if (!settings._shameSpam || ModuleHandler.moduleActive || EnemyManager.shouldIgnoreModule()) return;

        // CHECK IF BOTH ENTITY AND PLAYER ARE ACTUALLY TRAPPED
        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy === null || !nearestEnemy.isTrapped || !myPlayer.isTrapped) return;
        
        if (nearestEnemy.shameCount >= 7) return;

        // CHECK IF WE CAN ACTUALLY USE TRAP
        const hasTrap = myPlayer.getItemByType(ItemType.TRAP) === EItem.PIT_TRAP;
        if (!hasTrap || !myPlayer.canPlace(ItemType.TRAP)) return;

        // CHECK IF WE CAN USE GREAT HAMMER
        const { reloading } = ModuleHandler.staticModules;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const isPolearm = primary === EWeapon.POLEARM || primary === EWeapon.KATANA;
        if (!isPolearm) return;
        
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const isHammer = secondary === EWeapon.GREAT_HAMMER;
        const secondaryReloaded = reloading.isReloaded(WeaponType.SECONDARY);
        if (!isHammer || !secondaryReloaded) return;

        // CHECK IF WE CAN INSTANTLY DESTROY AN OBJECT
        const trappedIn = nearestEnemy.trappedIn!;
        const buildingDamage = myPlayer.getMaxBuildingDamage(trappedIn, true);
        if (buildingDamage === null || trappedIn.health > buildingDamage) return;

        // CHECK IF WE CAN ACTUALLY ATTACK OBJECT AND ENEMY
        const range = DataHandler.getWeapon(secondary).range;
        const attackRange = range + nearestEnemy.hitScale;
        const destroyRange = range + trappedIn.hitScale;
        if (!myPlayer.collidingSimple(nearestEnemy, attackRange)) return;
        if (!myPlayer.collidingSimple(trappedIn, destroyRange)) return;

        const pos1 = myPlayer.pos.current;
        const pos2 = trappedIn.pos.current;
        const pos3 = nearestEnemy.pos.current;
        const destroyAngle = pos1.angle(pos2);
        const attackAngle = pos1.angle(pos3);

        const placementAngle = ObjectManager.getBestPlacementAngles({
            position: pos1,
            id: EItem.PIT_TRAP,
            targetAngle: attackAngle,
            ignoreID: trappedIn.id,
            preplace: true,
            reduce: true,
            fill: true,
        })[0];
        if (placementAngle === undefined) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = destroyAngle;
        ModuleHandler.forceHat = EHat.TANK_GEAR;
        ModuleHandler.forceWeapon = WeaponType.SECONDARY;
        ModuleHandler.shouldAttack = true;
        this.active = true;

        ModuleHandler.place(ItemType.TRAP, placementAngle, true);
        const delay = this.client.SocketManager.TICK - this.client.SocketManager.pong / 2;
        setTimeout(() => {
            ModuleHandler.place(ItemType.TRAP, placementAngle, true);
        }, delay);
    }
}