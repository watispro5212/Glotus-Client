import type PlayerClient from "../../../PlayerClient";
import { EItem, EWeapon, ItemType, WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class DashMovement {
    readonly moduleName = "dashMovement";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { ModuleHandler, myPlayer } = this.client;
        const { currentType, currentAngle } = ModuleHandler;
        if (!myPlayer.canPlace(currentType) || !settings._dashMovement) return;

        const { reloading } = ModuleHandler.staticModules;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
        const boost = myPlayer.getItemByType(ItemType.TRAP);

        if (
            boost !== EItem.BOOST_PAD ||
            !ModuleHandler.hasStoreItem(EStoreType.HAT, EHat.TANK_GEAR) ||
            currentType !== ItemType.TRAP ||
            ModuleHandler.placedOnce
        ) return;
        
        const hasHammer = secondary === EWeapon.GREAT_HAMMER;
        const primaryDamage = myPlayer.getBuildingDamage(primary, true);
        const canOneHit = primaryDamage >= DataHandler.getItem(EItem.BOOST_PAD).health;
        
        let weaponType: WeaponType | null = null;
        if (canOneHit) {
            const primaryData = DataHandler.getWeapon(primary);
            const secondaryData = DataHandler.isMelee(secondary) && DataHandler.getWeapon(secondary) || null;
            if (secondaryData === null || primaryData.speed < secondaryData.speed) {
                weaponType = WeaponType.PRIMARY;
            }
        }

        if (weaponType === null && hasHammer) {
            weaponType = WeaponType.SECONDARY;
        }

        if (weaponType === null) return;
        ModuleHandler.placedOnce = true;

        const reloaded = reloading.isReloaded(weaponType);
        if (!reloaded) return;

        ModuleHandler.place(currentType, currentAngle);
        ModuleHandler.useAngle = currentAngle;
        ModuleHandler.useHat = EHat.TANK_GEAR;
        ModuleHandler.forceWeapon = weaponType;
        ModuleHandler.shouldAttack = true;
    }
}