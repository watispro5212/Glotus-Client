import { client, Glotus } from "..";
import type { TCTX } from "../types/Common";
import { clamp, lerp, lerpAngle } from "../utility/Common";
import Vector from "./Vector";

function easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x);
}

function shortAngle(a: number, b: number) {
    const PI2 = 2 * Math.PI;

    a = ((a % PI2) + PI2) % PI2;
    b = ((b % PI2) + PI2) % PI2;

    let diff = b - a;
    if (diff > PI2 / 2) {
        diff -= PI2;
    } else if (diff < -PI2 / 2) {
        diff += PI2;
    }

    return diff;
}

export default class DeadPlayer {

    readonly moveAngle: number;
    readonly skinColor: any;
    readonly angle: number;
    readonly weapon: number;
    readonly variant: number;
    readonly hatID: number;
    readonly accID: number;
    rotation: number;

    private readonly baseTime = 2000;
    private elapsedTime = 0;
    private readonly pos = new Vector;
    readonly lerpPos = new Vector;
    private acc = 7;
    private velocity = 0;
    opacity = 1;

    private readonly shortSign: number;

    constructor(
        startPos: Vector,
        moveAngle: number,
        skin: any,
        rotation: number,
        weapon: number,
        variant: number,
        hatID: number,
        accID: number,
        impulse: number
    ) {
        this.moveAngle = moveAngle;
        this.skinColor = skin;
        this.angle = rotation;
        this.weapon = weapon;
        this.variant = variant;
        this.hatID = hatID;
        this.accID = accID;
        this.rotation = rotation;
        this.pos.setVec(startPos);
        this.lerpPos.setVec(startPos);
        this.shortSign = Math.sign(shortAngle(this.angle, this.moveAngle));
        this.acc = (impulse || 10) / 10 * 75;
    }

    update(delta: number) {
        this.elapsedTime += delta;
        const progress = Math.min(this.elapsedTime / this.baseTime, 1);
        const easedProgress = easeOutQuad(progress);

        this.opacity = 1 - easedProgress;
        
        const dt = delta / 1000;
        const blend = 1 - Math.exp(-10 * dt);
        const PI = Math.PI;
        const rotationSpeed = (1 - easedProgress) / PI * blend;
        this.rotation += rotationSpeed * this.shortSign;
        
        this.velocity = this.acc * (1 - easedProgress);
        this.pos.add(Vector.fromAngle(this.moveAngle, this.velocity * dt));

        this.lerpPos.x = lerp(this.lerpPos.x, this.pos.x, blend);
        this.lerpPos.y = lerp(this.lerpPos.y, this.pos.y, blend);
    }

    isFinished() {
        return this.elapsedTime >= this.baseTime;
    }
}

export const DeadPlayerHandler = new class DeadPlayerHandler {
    readonly deadPlayers = new Set<DeadPlayer>();
    private start = Date.now();

    add(player: DeadPlayer) {
        this.deadPlayers.add(player);
    }

    render(ctx: TCTX, pos: Vector, color: string) {
        const player = client.myPlayer;
        if (!player.inGame) return;

        const offset = Glotus._offset;
        ctx.save();
        ctx.translate(pos.x - offset.x, pos.y - offset.y);
        ctx.rotate(player.angle);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "#525252";

        const { autoHat } = client._ModuleHandler.staticModules;
        const weaponID = autoHat.getNextWeaponID();
        const variant = player.getWeaponVariant(weaponID).current
        Glotus._hooks._renderPlayer({
            weaponIndex: weaponID,
            buildIndex: autoHat.getNextItemID(),
            tailIndex: autoHat.getNextAcc(),
            skinIndex: autoHat.getNextHat(),
            weaponVariant: variant,
            skinColor: player.skinID,
            scale: 35,
        }, ctx);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    update(ctx: TCTX) {
        const now = Date.now();
        const delta = now - this.start;
        this.start = now;

        const offset = Glotus._offset;
        for (const player of this.deadPlayers) {
            player.update(delta);

            ctx.save();
            ctx.translate(player.lerpPos.x - offset.x, player.lerpPos.y - offset.y);
            ctx.rotate(player.rotation);
            ctx.globalAlpha = player.opacity;
            ctx.strokeStyle = "#525252";
            Glotus._hooks._renderPlayer({
                weaponIndex: player.weapon,
                buildIndex: -1,
                tailIndex: player.accID,
                skinIndex: player.hatID,
                weaponVariant: player.variant,
                skinColor: player.skinColor,
                scale: 35,
            }, ctx);
            ctx.restore();

            if (player.isFinished()) {
                this.deadPlayers.delete(player);
            }
        }
    }
}