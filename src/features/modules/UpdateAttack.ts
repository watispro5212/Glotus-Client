import PlayerClient from "../../PlayerClient";
import { ESentAngle } from "../../types/Enums";

class UpdateAttack {
    readonly moduleName = "updateAttack";
    private readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private getAttackAngle() {
        const { useAngle, currentAngle } = this.client.ModuleHandler;
        if (useAngle !== null) return useAngle;
        return currentAngle;
    }

    postTick(): void {
        const { ModuleHandler } = this.client;
        const { useWeapon, forceWeapon, weapon, attacking, moveTo, prevMoveTo, sentAngle, staticModules } = ModuleHandler;
        const { reloading } = staticModules;

        const nextWeapon = forceWeapon !== null ? forceWeapon : useWeapon;
        if (nextWeapon !== null && nextWeapon !== weapon) {
            const isReloaded = reloading.isReloaded(weapon);
            if (isReloaded || forceWeapon !== null) {
                ModuleHandler.whichWeapon(nextWeapon);
            }
        }

        // if (useItem !== null) {
        //     ModuleHandler.selectItem(useItem);
        // }

        if (prevMoveTo !== moveTo) {
            const angle = moveTo === "disable" ? ModuleHandler.move_dir : moveTo;
            ModuleHandler.startMovement(angle, true);
        }

        if (ModuleHandler.shouldAttack) {
            const angle = this.getAttackAngle();
            ModuleHandler.attack(angle);
            ModuleHandler.stopAttack();
            
            const reload = reloading.currentReload;
            reloading.updateMaxReload(reload);
            reloading.resetReload(reload);
        } else if (!attacking && sentAngle !== ESentAngle.NONE) {
            ModuleHandler.stopAttack();
        }
    }
}

export default UpdateAttack;