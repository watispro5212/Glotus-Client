import Config from "../../../constants/Config";
import type { PlayerObject } from "../../../data/ObjectItem";
import type PlayerClient from "../../../PlayerClient";
import { EAttack } from "../../../types/Enums";
import { EItem, EWeapon, ItemType, WeaponType, WeaponVariant } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import { findMiddleAngle, getAngleDist } from "../../../utility/Common";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AutoGrind {
    readonly moduleName = "autoGrind";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private isFullyUpgraded() {
        const { myPlayer: myPlayer } = this.client;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        const upgradedSecondary = (
            secondary === EWeapon.GREAT_HAMMER &&
            myPlayer.getWeaponVariant(secondary).current >= WeaponVariant.GOLD
        );

        const upgradedPrimary = (
            primary !== EWeapon.STICK &&
            myPlayer.getWeaponVariant(primary).current >= WeaponVariant.DIAMOND
        );

        return upgradedSecondary && upgradedPrimary;
    }

    private getGrindWeapon(): WeaponType | null {
        const { myPlayer: myPlayer, EnemyManager, _ModuleHandler: ModuleHandler } = this.client;

        const nearestObject = EnemyManager.nearestPlayerObject;
        const secondNearestObject = EnemyManager.secondNearestPlayerObject;
        if (nearestObject === null) return null;

        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);

        if (secondary === EWeapon.GREAT_HAMMER) {
            if (myPlayer.getWeaponVariant(secondary).current < WeaponVariant.GOLD) {
                return WeaponType.SECONDARY;
            }
            
            const useTank = ModuleHandler.canBuy(EStoreType.HAT, EHat.TANK_GEAR);
            const damage = myPlayer.getBuildingDamage(EWeapon.GREAT_HAMMER, useTank);
            const range = DataHandler.getWeapon(secondary).range;
            const canHit1 = (
                myPlayer.colliding(nearestObject, range + nearestObject.hitScale) &&
                nearestObject.health > damage
            );

            const canHit2 = (
                secondNearestObject !== null &&
                myPlayer.colliding(secondNearestObject, range + secondNearestObject.hitScale) &&
                secondNearestObject.health > damage
            );
            
            if (canHit1 && canHit2) {
                return WeaponType.SECONDARY;
            }
        }

        if (
            primary !== EWeapon.STICK &&
            myPlayer.getWeaponVariant(primary).current < WeaponVariant.DIAMOND
        ) {
            return WeaponType.PRIMARY
        }

        return null;
    }

    private placeTurret(angle: number): boolean {
        const { myPlayer: myPlayer, ObjectManager, _ModuleHandler: ModuleHandler } = this.client;
        const id = myPlayer.getItemByType(ItemType.TURRET)!;
        const position = myPlayer.getPlacePosition(myPlayer.pos.future, id, angle);
        if (!ObjectManager.canPlaceItem(id, position)) return false;

        const type = ItemType.TURRET;
        ModuleHandler.place(type, angle);
        ModuleHandler.placedOnce = true;
        ModuleHandler.placeAngles[0] = ItemType.TURRET;
        ModuleHandler.placeAngles[1].push(angle);
        return true;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (
            !settings._autoGrind ||
            ModuleHandler.moduleActive ||
            ModuleHandler.placedOnce ||
            ModuleHandler.healedOnce ||
            ModuleHandler.isMoving ||
            myPlayer.speed > 5 ||
            this.isFullyUpgraded()
        ) return;
        
        const { autoMill, reloading } = ModuleHandler.staticModules;
        if (autoMill.isActive) return;

        const farmItem = myPlayer.getItemByType(ItemType.TURRET);
        if (farmItem !== EItem.TURRET && farmItem !== EItem.TELEPORTER) return;

        const nearestEnemy = EnemyManager.nearestEnemy;
        if (nearestEnemy !== null && myPlayer.collidingSimple(nearestEnemy, 400)) return;

        const itemType = ItemType.TURRET;
        if (!myPlayer.canPlace(itemType)) return;

        const item = DataHandler.getItem(farmItem);
        const distance = myPlayer.getItemPlaceScale(item.id);
        const angle = ModuleHandler._currentAngle;

        const angleBetween = Math.asin((2 * item.scale + 15) / (2 * distance));
        this.placeTurret(angle - angleBetween);
        this.placeTurret(angle + angleBetween);

        const nearestObject = EnemyManager.nearestPlayerObject;
        const secondNearestObject = EnemyManager.secondNearestPlayerObject;

        if (nearestObject === null || nearestObject.type !== EItem.TURRET && nearestObject.type !== EItem.TELEPORTER) return;

        const pos1 = myPlayer.pos.current;
        let tempAngle = pos1.angle(nearestObject.pos.current);

        const weaponType = this.getGrindWeapon();
        if (weaponType === null) return;

        const weapon = myPlayer.getItemByType(weaponType)!;
        if (secondNearestObject !== null && nearestObject !== secondNearestObject) {
            const pos3 = secondNearestObject.pos.current;
            const distance = pos1.distance(pos3);
            const range = DataHandler.getWeapon(weapon).range + secondNearestObject.hitScale;

            const angle2 = pos1.angle(pos3);
            const middleAngle = findMiddleAngle(tempAngle, angle2);
            if (
                distance <= range &&
                getAngleDist(tempAngle, middleAngle) <= Config.gatherAngle &&
                getAngleDist(angle2, middleAngle) <= Config.gatherAngle
            ) {
                tempAngle = middleAngle;
            }
        }

        if (reloading.isReloaded(weaponType)) {
            ModuleHandler.moduleActive = true;
            ModuleHandler.useAngle = tempAngle;
            ModuleHandler.useHat = EHat.TANK_GEAR;
            ModuleHandler.forceWeapon = weaponType;
            ModuleHandler.shouldAttack = true;
        }
    }
}