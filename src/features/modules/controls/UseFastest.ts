import type PlayerClient from "../../../PlayerClient";
import { WeaponType } from "../../../types/Items";

/** Combat module, that switches to the faster weapon in order to gain max movement speed */
export default class UseFastest {
    readonly moduleName = "useFastest";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = this.client;
        if (ModuleHandler.moduleActive) return;
        
        const { reloading } = ModuleHandler.staticModules;
        // const { forceWeapon } = ModuleHandler;
        // if (forceWeapon !== null && !reloading.isReloaded(forceWeapon)) {
        //     ModuleHandler.forceWeapon = forceWeapon;
        //     return;
        // }
        
        const type = myPlayer.getFastestWeapon();
        const reverse_type = type === WeaponType.PRIMARY ? WeaponType.SECONDARY : WeaponType.PRIMARY;
        if (!reloading.isReloaded(type)) {
            ModuleHandler.useWeapon = type;
        } else if (!reloading.isReloaded(reverse_type) && myPlayer.getItemByType(reverse_type) !== null) {
            ModuleHandler.useWeapon = reverse_type;
        } else {
            ModuleHandler.useWeapon = type;
        }
    }
}