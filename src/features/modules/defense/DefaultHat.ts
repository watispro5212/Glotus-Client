import type PlayerClient from "../../../PlayerClient";
import { ItemGroup } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import { pointInRiver } from "../../../utility/Common";
import settings from "../../../utility/Settings";

export default class DefaultHat {
    readonly moduleName = "defaultHat";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getBestCurrentHat() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        const { current, future } = myPlayer.pos;
        const { actual } = ModuleHandler.getHatStore();

        const useFlipper = ModuleHandler.canBuy(EStoreType.HAT, EHat.FLIPPER_HAT);
        const useSoldier = ModuleHandler.canBuy(EStoreType.HAT, EHat.SOLDIER_HELMET);
        const useWinter = ModuleHandler.canBuy(EStoreType.HAT, EHat.WINTER_CAP);
        const useActual = ModuleHandler.canBuy(EStoreType.HAT, actual);
        const useBooster = ModuleHandler.canBuy(EStoreType.HAT, EHat.BOOSTER_HAT);
        const useBull = ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET);
        const useEmp = ModuleHandler.canBuy(EStoreType.HAT, EHat.EMP_HELMET);

        if (useActual && !ModuleHandler.isMoving && myPlayer.speed <= 5 && actual !== 0) {
            return actual;
        }

        if (useSoldier) {
            if (settings._antienemy) {
                if (
                    EnemyManager.detectedDangerEnemy ||
                    EnemyManager.detectedEnemy ||
                    EnemyManager.velocityTickThreat ||
                    EnemyManager.reverseInsta ||
                    EnemyManager.toolHammerInsta ||
                    EnemyManager.rangedBowInsta
                ) {
                    ModuleHandler.shouldEquipSoldier = true;
                    ModuleHandler.forceHat = EHat.SOLDIER_HELMET;
                    return EHat.SOLDIER_HELMET;
                }

                if (useBull && myPlayer.shameCount > 0 || EnemyManager.dangerWithoutSoldier) {
                    return EHat.SOLDIER_HELMET;
                }
            }

            if (
                settings._antispike &&
                EnemyManager.willCollideSpike
            ) return EHat.SOLDIER_HELMET;
        }
        
        if (settings._biomehats && useFlipper && !myPlayer.onPlatform) {
            const inRiver = pointInRiver(current) || pointInRiver(future);
            if (inRiver) {
                return EHat.FLIPPER_HAT;
            }
        }

        if (useSoldier) {
            // if (settings._soldierDefault) {
            //     if (EnemyManager.nearestEnemyInRangeOf(270)) {
            //         return EHat.SOLDIER_HELMET;
            //     }
            // }
            
            if (
                settings._antianimal &&
                EnemyManager.nearestDangerAnimal !== null
            ) return EHat.SOLDIER_HELMET;
        }

        if (useEmp && settings._empDefense && (!ModuleHandler.isMoving || myPlayer.speed <= 5)) {
            return EHat.EMP_HELMET;
        }
        
        if (settings._biomehats && useWinter) {
            const inWinter = current.y <= 2400 || future.y <= 2400;
            if (inWinter) {
                return EHat.WINTER_CAP;
            }
        }

        // if (useActual) return actual;
        if (useBooster) return EHat.BOOSTER_HAT;
        return EHat.UNEQUIP;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler } = this.client;
        const hat = this.getBestCurrentHat();
        ModuleHandler.useHat = hat;
    }
}