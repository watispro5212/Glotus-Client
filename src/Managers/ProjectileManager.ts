import type { PlayerObject } from "../data/ObjectItem";
import Projectile from "../data/Projectile";
import PlayerClient from "../PlayerClient";
import { getAngleDist } from "../utility/Common";

class ProjectileManager {

    private readonly client: PlayerClient;

    /** Contains players projectiles. Extraction is performed using bullet speed */
    readonly projectiles = new Map<number, Projectile[]>();

    /** Contains hashes of turret objects that need to be excluded when a turret projectile appears */
    readonly ignoreCreation = new Map<string, PlayerObject>();

    private readonly dangerProjectiles = new Set<Projectile>();
    readonly toRemove = new Set<number>();

    totalDamage = 0;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    createProjectile(projectile: Projectile) {
        const key = projectile.speed;
        if (!this.projectiles.has(key)) {
            this.projectiles.set(key, []);
        }

        const list = this.projectiles.get(key)!;
        list.push(projectile);
    }

    foundProjectile(projectile: Projectile) {
        const owner = projectile.ownerClient;
        if (owner === null) return;

        const { PlayerManager, myPlayer: myPlayer } = this.client;
        if (PlayerManager.isEnemyByID(owner.id, myPlayer)) {
            const pos1 = projectile.pos.current;
            const pos2 = myPlayer.pos.current;
            const distance = pos1.distance(pos2);
            const angle = pos1.angle(pos2);
            const offset = Math.asin((2 * myPlayer.scale) / (2 * distance));
            const lookingAt = getAngleDist(angle, projectile.angle) <= offset;
            if (lookingAt) {
                this.dangerProjectiles.add(projectile);
            }
        }
    }

    foundProjectileThreat(projectile: Projectile) {
        const owner = projectile.ownerClient;
        if (owner === null) return;

        const { PlayerManager, myPlayer: myPlayer, SocketManager } = this.client;
        for (const enemy of PlayerManager.enemies) {
            if (!PlayerManager.isEnemyByID(owner.id, enemy)) continue;

            const pos1 = projectile.pos.current;
            const pos2 = enemy.pos.current;
            const distance = pos1.distance(pos2);
            const angle = pos1.angle(pos2);
            const offset = Math.asin((2 * enemy.scale) / (2 * distance));
            const lookingAt = getAngleDist(angle, projectile.angle) <= offset;
            if (lookingAt) {
                const tickDistance = Math.ceil(distance / (projectile.speed * SocketManager.TICK));
                enemy.nextDamageTick = myPlayer.tickCount + tickDistance;
            }
        }
    }

    postTick() {
        this.projectiles.clear();
        this.totalDamage = 0;

        for (const proj of this.dangerProjectiles) {
            proj.life -= 1;
            if (proj.shouldRemove() || this.toRemove.delete(proj.id)) {
                this.dangerProjectiles.delete(proj);
                continue;
            }

            this.totalDamage += proj.damage;
        }
        this.toRemove.clear();
    }
}

export default ProjectileManager;