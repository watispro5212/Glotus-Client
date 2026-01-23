import type PlayerClient from "../../../PlayerClient";
import { EAttack } from "../../../types/Enums";
import { EWeapon, WeaponType } from "../../../types/Items";

export default class UseDestroying {
    readonly moduleName = "useDestroying";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    // private getDestroyType() {
    //     const { myPlayer, EnemyManager } = this.client;

    //     const secondary = myPlayer.getItemByType(WeaponType.SECONDARY);
    //     if (secondary === EWeapon.GREAT_HAMMER) {
    //         const nearestObject = EnemyManager.nearestPlayerObject;
    //         const type = myPlayer.getBestDestroyingWeapon(nearestObject);
    //         return type;
    //     }

    //     return WeaponType.SECONDARY;
    // }

    postTick() {
        const { myPlayer, ModuleHandler, EnemyManager } = this.client;
        if (
            ModuleHandler.moduleActive ||
            ModuleHandler.attackingState !== EAttack.DESTROY ||
            ModuleHandler.forceWeapon !== null
        ) return;

        const nearestObject = EnemyManager.nearestPlayerObject;
        const type = myPlayer.getBestDestroyingWeapon(nearestObject);
        ModuleHandler.forceWeapon = type;
        ModuleHandler.shouldAttack = true;
    }
}