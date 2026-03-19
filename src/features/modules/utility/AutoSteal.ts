import type PlayerClient from "../../../PlayerClient";
import { WeaponType } from "../../../types/Items";
import { EHat, EStoreType } from "../../../types/Store";
import DataHandler from "../../../utility/DataHandler";
import settings from "../../../utility/Settings";

export default class AutoSteal {
    readonly moduleName = "autoSteal";
    private readonly client: PlayerClient;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    postTick() {
        const { _ModuleHandler: ModuleHandler, EnemyManager, myPlayer: myPlayer } = this.client;
        if (ModuleHandler.moduleActive || !settings._autoSteal) return;

        const nearestLowEntity = EnemyManager.nearestLowEntity;
        if (nearestLowEntity === null) return;

        const { reloading } = ModuleHandler.staticModules;
        const primary = myPlayer.getItemByType(WeaponType.PRIMARY);
        const range = DataHandler.getWeapon(primary).range + nearestLowEntity.hitScale;
        if (
            !myPlayer.collidingSimple(nearestLowEntity, range) ||
            !reloading.isReloaded(WeaponType.PRIMARY)
        ) return;

        const canUseBull = ModuleHandler.canBuy(EStoreType.HAT, EHat.BULL_HELMET);
        const pos1 = myPlayer.pos.current;
        const pos2 = nearestLowEntity.pos.current;
        const angle = pos1.angle(pos2);

        const maxDamageBull = myPlayer.getMaxWeaponDamage(primary, false, canUseBull);
        const maxDamage = myPlayer.getMaxWeaponDamage(primary, false, false);
        const canKill = maxDamageBull >= nearestLowEntity.currentHealth;
        if (!canKill) return;

        ModuleHandler.moduleActive = true;
        ModuleHandler.useAngle = angle;
        if (maxDamage < nearestLowEntity.currentHealth) {
            ModuleHandler.forceHat = EHat.BULL_HELMET;
        }
        ModuleHandler.forceWeapon = WeaponType.PRIMARY;
        ModuleHandler.shouldAttack = true;
    }
}