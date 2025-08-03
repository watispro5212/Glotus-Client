import { fixTo } from './../utility/Common';
import Config from "../constants/Config";
import settings from "../utility/Settings";
import Vector from "../modules/Vector";
import { type TCTX } from "../types/Common";
import { type IRenderEntity, type IRenderObject } from "../types/RenderTargets";
import { WeaponVariants } from "../constants/Items";
import Player from "../data/Player";
import { clamp, getTargetValue, setTargetValue } from "../utility/Common";
import Animal from "../data/Animal";
import { Notify } from "./NotificationRenderer";
import { client } from "..";
import DataHandler from "../utility/DataHandler";
import ZoomHandler from '../modules/ZoomHandler';

const Renderer = new class Renderer {
    readonly renderObjects: IRenderObject[] = [];

    preRender() {
        ZoomHandler.smoothUpdate();
    }

    rect(ctx: TCTX, pos: Vector, scale: number, color: string, lineWidth = 4, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.translate(pos.x, pos.y);
        ctx.rect(-scale, -scale, scale * 2, scale * 2);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    roundRect(ctx: TCTX, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        if (r < 0) r = 0;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    circle(
        ctx: TCTX,
        x: number, y: number,
        radius: number,
        color: string,
        opacity = 1,
        lineWidth = 4
    ) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    fillCircle(
        ctx: TCTX,
        x: number, y: number,
        radius: number,
        color: string,
        opacity = 1,
    ) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    renderText(ctx: TCTX, text: string, x: number, y: number, fontSize = 14, opacity = 0.5) {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#3d3f42";
        ctx.lineWidth = 8;
        ctx.lineJoin = "round";
        ctx.textBaseline = "top";
        ctx.globalAlpha = opacity;
        ctx.font = `${fontSize}px Hammersmith One`;
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    line(ctx: TCTX, start: Vector, end: Vector, color: string, opacity = 1, lineWidth = 4) {
        ctx.save();
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();
    }

    arrow(ctx: TCTX, length: number, x: number, y: number, angle: number, color: string) {
        ctx.save();
        ctx.translate(-client.myPlayer.offset.x, -client.myPlayer.offset.y);
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-length, -length);
        ctx.lineTo(length, -length);
        ctx.lineTo(length, length);
        ctx.stroke();
        ctx.restore();
    }

    cross(ctx: TCTX, x: number, y: number, size: number, lineWidth: number, color: string) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.translate(x - client.myPlayer.offset.x, y - client.myPlayer.offset.y);
        const halfSize = size / 2;
        ctx.beginPath();
        ctx.moveTo(-halfSize, -halfSize);
        ctx.lineTo(halfSize, halfSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(halfSize, -halfSize);
        ctx.lineTo(-halfSize, halfSize);
        ctx.stroke();
        ctx.restore();
    }

    getTracerColor(entity: IRenderEntity | Notify): string | null {
        if (entity instanceof Notify) return settings._notificationTracersColor;
        if (settings._animalTracers && entity.isAI) return settings._animalTracersColor;

        if (
            settings._teammateTracers &&
            entity.isPlayer &&
            client.myPlayer.isTeammateByID(entity.sid)
        ) return settings._teammateTracersColor;

        if (
            settings._enemyTracers &&
            entity.isPlayer &&
            client.myPlayer.isEnemyByID(entity.sid)
        ) return settings._enemyTracersColor;

        return null;
    }

    renderTracer(ctx: TCTX, entity: IRenderEntity | Notify, player: IRenderEntity) {
        const color = this.getTracerColor(entity);
        if (color === null) return;

        const pos1 = new Vector(player.x, player.y);
        const pos2 = new Vector(entity.x, entity.y);

        if (settings._arrows) {
            const w = 8;
            const distance = Math.min(100 + w * 2, pos1.distance(pos2) - w * 2);
            const angle = pos1.angle(pos2);
            const pos = pos1.addDirection(angle, distance);
            this.arrow(ctx, w, pos.x, pos.y, angle, color);
        } else {
            this.line(ctx, pos1, pos2, color, 0.75);
        }
    }

    renderDistance(ctx: TCTX, entity: IRenderEntity, player: IRenderEntity) {
        const pos1 = new Vector(player.x, player.y);
        const pos2 = new Vector(entity.x, entity.y);

        const entityTarget = client.PlayerManager.getEntity(entity.sid, !!entity.isPlayer);
        if (entityTarget === null) return;

        const pos3 = client.myPlayer.pos.current;
        const pos4 = entityTarget.pos.current;
        const distance = fixTo(pos3.distance(pos4), 2);
        const center = pos1.addDirection(pos1.angle(pos2), pos1.distance(pos2) / 2);
        this.renderText(ctx, `[${entity.sid}]: ${distance}`, center.x, center.y);
    }

    getMarkerColor(object: IRenderObject): string | null {

        // ID of the owner
        // if ID is undefined, it means object is a resource
        const id = object.owner?.sid;
        if (id === undefined) return null;
        if (
            settings._itemMarkers &&
            client.myPlayer.isMyPlayerByID(id)
        ) return settings._itemMarkersColor;

        if (
            settings._teammateMarkers &&
            client.myPlayer.isTeammateByID(id)
        ) return settings._teammateMarkersColor;

        if (
            settings._enemyMarkers &&
            client.myPlayer.isEnemyByID(id)
        ) return settings._enemyMarkersColor;

        return null;
    }

    renderMarker(ctx: TCTX, object: IRenderObject) {
        const color = this.getMarkerColor(object);
        if (color === null) return;
        const x = object.x + object.xWiggle - client.myPlayer.offset.x;
        const y = object.y + object.yWiggle - client.myPlayer.offset.y;
        ctx.save();
        ctx.strokeStyle = "#3b3b3b";
        ctx.lineWidth = 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    barContainer(
        ctx: TCTX,
        x: number,
        y: number,
        w: number,
        h: number,
        r = 8
    ) {
        ctx.fillStyle = "#3d3f42";
        this.roundRect(ctx, x, y, w, h, r);
        ctx.fill();
    }

    barContent(
        ctx: TCTX,
        x: number,
        y: number,
        w: number,
        h: number,
        fill: number,
        color: string,
    ) {
        const barPad = Config.barPad;
        ctx.fillStyle = color;
        this.roundRect(ctx, x + barPad, y + barPad, (w - barPad * 2) * fill, h - barPad * 2, 7);
        ctx.fill();
    }

    private getNameY(target?: Animal | Player) {
        let nameY = 34;
        const height = 5;
        if (target === client.myPlayer && settings._weaponXPBar) nameY += height;
        if (settings._playerTurretReloadBar) nameY += height;
        if (settings._weaponReloadBar) nameY += height;
        return nameY;
    }

    getContainerHeight(entity: IRenderEntity): number {
        const { barHeight, barPad } = Config;
        let height = barHeight;
        if (entity.isPlayer) {
            const smallBarHeight = barHeight - 4;
            const player = client.PlayerManager.playerData.get(entity.sid);
            if (player === undefined) return height;

            if (player === client.myPlayer && settings._weaponXPBar) height += smallBarHeight - barPad;
            if (settings._playerTurretReloadBar) height += smallBarHeight - barPad;
            if (settings._weaponReloadBar) height += barHeight - barPad;
        }
        return height;
    }

    renderBar(ctx: TCTX, entity: IRenderEntity) {
        const { barWidth, barHeight, barPad } = Config;
        const smallBarHeight = barHeight - 4;
        const totalWidth = barWidth + barPad;
        const scale = entity.scale + 34;

        const { myPlayer, PlayerManager } = client;
        let x = entity.x - myPlayer.offset.x - totalWidth;
        let y = entity.y - myPlayer.offset.y + scale;
        ctx.save();

        const player = entity.isPlayer && PlayerManager.playerData.get(entity.sid);
        const animal = entity.isAI && PlayerManager.animalData.get(entity.sid);

        let height = 0;
        if (player instanceof Player) {

            const [ primary, secondary, turret ] = player.reload;

            // Weapon XP Bar
            if (player === myPlayer && settings._weaponXPBar) {
                const weapon = DataHandler.getWeapon(myPlayer.weapon.current);
                const current = WeaponVariants[myPlayer.getWeaponVariant(weapon.id).current].color;
                const next = WeaponVariants[myPlayer.getWeaponVariant(weapon.id).next].color;
                const XP = myPlayer.weaponXP[weapon.itemType];

                this.barContainer(ctx, x, y, totalWidth * 2, smallBarHeight);
                this.barContent(ctx, x, y, totalWidth * 2, smallBarHeight, 1, current);
                this.barContent(ctx, x, y, totalWidth * 2, smallBarHeight, clamp(XP.current / XP.max, 0, 1), next);
                height += smallBarHeight - barPad;
            }

            // Turret Reload Bar
            if (settings._playerTurretReloadBar) {
                this.barContainer(ctx, x, y + height, totalWidth * 2, smallBarHeight);
                this.barContent(ctx, x, y + height, totalWidth * 2, smallBarHeight, turret.current / turret.max, settings._playerTurretReloadBarColor);
                height += smallBarHeight - barPad;
            }

            // Weapon Reload Bar
            if (settings._weaponReloadBar) {
                const extraPad = 2.25;
                this.barContainer(ctx, x, y + height, totalWidth * 2, barHeight);
                this.barContent(ctx, x, y + height, totalWidth + extraPad, barHeight, primary.current / primary.max, settings._weaponReloadBarColor);
                this.barContent(ctx, x + totalWidth - extraPad, y + height, totalWidth + extraPad, barHeight, secondary.current / secondary.max, settings._weaponReloadBarColor);
                height += barHeight - barPad;
            }
        }

        const target = player || animal;
        if (target) {
            const container = getTargetValue(window, "config");
            setTargetValue(container, "nameY", this.getNameY(target));
            
            const { currentHealth, maxHealth } = target;
            const health = animal ? maxHealth : 100;
            const color = PlayerManager.isEnemyTarget(myPlayer, target) ? "#cc5151" : "#8ecc51";
            this.barContainer(ctx, x, y + height, totalWidth * 2, barHeight);
            this.barContent(ctx, x, y + height, totalWidth * 2, barHeight, currentHealth / health, color);
            height += barHeight;
        }

        ctx.restore();
    }

    renderHP(ctx: TCTX, entity: IRenderEntity) {
        if (!settings._renderHP) return;

        const { barPad, nameY } = Config;
        const containerHeight = this.getContainerHeight(entity);
        let text = `HP ${Math.floor(entity.health)}/${entity.maxHealth}`;
        const offset = entity.scale + nameY + barPad + containerHeight;

        const { myPlayer } = client;
        const x = entity.x - myPlayer.offset.x;
        const y = entity.y - myPlayer.offset.y + offset;

        if (entity.isPlayer && myPlayer.isMyPlayerByID(entity.sid)) {
            text += ` ${myPlayer.shameCount}/8`;
        }

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#3d3f42";
        ctx.lineWidth = 8;
        ctx.lineJoin = "round";
        ctx.textBaseline = "top";
        ctx.font = `19px Hammersmith One`;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    circularBar(
        ctx: TCTX,
        object: IRenderObject,
        perc: number,
        angle: number,
        color: string,
        offset = 0
    ): number {
        const x = object.x + object.xWiggle - client.myPlayer.offset.x;
        const y = object.y + object.yWiggle - client.myPlayer.offset.y;
        const height = Config.barHeight * 0.7;
        const defaultScale = 10 + height / 2;
        const scale = defaultScale + 3 + offset;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.lineCap = "round";
        ctx.strokeStyle = "#3b3b3b";
        ctx.lineWidth = height;
        ctx.beginPath();
        ctx.arc(0, 0, scale, 0, perc * 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();

        ctx.strokeStyle = color;
        ctx.lineWidth = height / 3;
        ctx.beginPath();
        ctx.arc(0, 0, scale, 0, perc * 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();

        ctx.restore();
        return defaultScale - 3;
    }
}

export default Renderer;