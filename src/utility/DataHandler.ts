import { Items, Projectiles, Weapons } from "../constants/Items";
import { Accessories, Hats, store } from "../constants/Store";
import { EItem, EWeapon, ItemType, type TAttackable, type TDestroyable, type THealable, type TMelee, type TPlaceable, type TPrimary, type TSecondary, type TShootable, WeaponType, WeaponVariant } from "../types/Items";
import { EAccessory, EHat, EStoreType } from "../types/Store";
import Logger from "./Logger";

/** Used in order to optimize management with constant data */
const DataHandler = new class DataHandler {
    isWeaponType(type: WeaponType | ItemType): type is WeaponType {
        return type <= WeaponType.SECONDARY;
    }

    isItemType(type: WeaponType | ItemType): type is ItemType {
        return type >= ItemType.FOOD;
    }

    getStore<T extends EStoreType>(type: T) {
        return store[type];
    }

    getStoreItem<T extends EStoreType, R extends [EHat, EAccessory][T]>(type: T, id: R) {
        switch (type) {
            case EStoreType.HAT:
                return Hats[id as EHat];
            case EStoreType.ACCESSORY:
                return Accessories[id as EAccessory];
            default:
                throw new Error(`getStoreItem Error: type "${type}" is not defined`);
        }
    }

    /**
     * Returns a projectile data from shootable weapon ID
     */
    getProjectile(id: TShootable) {
        return Projectiles[this.getWeapon(id).projectile];
    }

    getWeapon<T extends EWeapon>(id: T) {
        return Weapons[id];
    }

    getItem<T extends EItem>(id: T) {
        return Items[id];
    }

    isWeapon(id: number): id is EWeapon {
        return this.getWeapon(id) !== undefined;
    }

    isItem(id: number): id is EItem {
        return Items[id] !== undefined;
    }

    isPrimary(id: EWeapon | null): id is TPrimary {
        return id != null && this.getWeapon(id).itemType === WeaponType.PRIMARY;
    }

    isSecondary(id: EWeapon | null): id is TSecondary {
        return id != null && this.getWeapon(id).itemType === WeaponType.SECONDARY;
    }

    isMelee(id: EWeapon | null): id is TMelee {
        return id != null && "damage" in this.getWeapon(id);
    }

    isAttackable(id: EWeapon | null): id is TAttackable {
        return id != null && "range" in this.getWeapon(id);
    }

    /**
     * Checks if weapon can shoot
     */
    isShootable(id: EWeapon | null): id is TShootable {
        return id != null && "projectile" in this.getWeapon(id);
    }

    isPlaceable(id: EItem | -1): id is TPlaceable {
        return id !== -1 && "itemGroup" in Items[id];
    }

    isHealable(id: EItem): id is THealable {
        return "restore" in Items[id];
    }

    /**
     * Checks if item has health by ID
     */
    isDestroyable(id: TPlaceable): id is TDestroyable {
        return "health" in Items[id];
    }

    canMoveOnTop(id: TPlaceable) {
        return "ignoreCollision" in Items[id];
    }
}

export default DataHandler;