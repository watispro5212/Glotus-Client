// import { Weapons } from "../../constants/Items";
// import type PlayerClient from "../../PlayerClient";
// import { EAccessory, EStoreType } from "../../types/Store";
// import DataHandler from "../../utility/DataHandler";

// export default class UtilityAcc {
//     readonly moduleName = "utilityAcc";
//     private readonly client: PlayerClient;

//     constructor(client: PlayerClient) {
//         this.client = client;
//     }

//     private getBestUtilityAcc() {
//         const { ModuleHandler, EnemyManager, myPlayer } = this.client;

//         const id = myPlayer.getItemByType(ModuleHandler.weapon)!;
//         if (!DataHandler.isMelee(id)) return null;

//         const weapon = DataHandler.getWeapon(id);
//         if (weapon.damage <= 1) return null;

//         const canBloody = ModuleHandler.canBuy(EStoreType.ACCESSORY, EAccessory.BLOOD_WINGS);
//         if (
//             EnemyManager.nearestMeleeReloaded === null &&
//             ModuleHandler.canHitEntity
//         ) {
//             if (canBloody) return EAccessory.BLOOD_WINGS;
//             return EAccessory.UNEQUIP;
//         }
//         return null;
//     }

//     postTick() {
//         const { ModuleHandler } = this.client;
//         const acc = this.getBestUtilityAcc();
//         if (acc !== null) {
//             ModuleHandler.useAcc = acc;
//         }
//     }
// }