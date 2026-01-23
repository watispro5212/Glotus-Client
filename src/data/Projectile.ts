import { Projectiles } from "../constants/Items";
import Vector from "../modules/Vector";
import { EProjectile } from "../types/Items";
import Player from "./Player";

class Projectile {
    readonly pos = {} as {
        previous: Vector;
        current: Vector;
        future: Vector;
    }

    readonly angle: number;
    readonly range: number;
    readonly speed: number;
    readonly type: EProjectile;

    /**
     * 1 if projectile can move above some buildings
     */
    readonly onPlatform: 1 | 0;
    id: number;
    readonly isTurret: boolean;
    readonly scale: typeof Projectiles[number]["scale"];
    readonly maxRange: number;
    readonly damage: typeof Projectiles[number]["damage"];
    owner: Player | null = null;
    life = 9;

    constructor(
        angle: number,
        range: number,
        speed: number,
        type: EProjectile,
        onPlatform: 1 | 0,
        id: number,
        maxRange?: number,
    ) {
        this.isTurret = type === EProjectile.TURRET;
        this.angle = angle;
        this.range = range;
        this.speed = speed;
        this.type = type;
        this.onPlatform = onPlatform;
        this.id = id;
        this.scale = Projectiles[type].scale;
        this.maxRange = maxRange || 0;
        this.damage = Projectiles[type].damage;
    }

    formatFromCurrent(pos: Vector, increase: boolean) {
        if (this.isTurret) return pos;
        return pos.addDirection(this.angle, increase ? 70 : -70);
    }

    shouldRemove() {
        return this.life <= 0;
    }
}

export default Projectile;