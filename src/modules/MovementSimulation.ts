import { Accessories, Hats } from './../constants/Store';
import Player from "../data/Player";
import DataHandler from '../utility/DataHandler';
import Config from '../constants/Config';
import { clamp, getAngle, getDistance } from '../utility/Common';
import type PlayerClient from '../PlayerClient';
import { PlayerObject, Resource } from '../data/ObjectItem';
import Vector from './Vector';
import { EItem } from '../types/Items';
import { Items } from '../constants/Items';
import settings from '../utility/Settings';

export default class MovementSimulation {
    private readonly speed = Config.playerSpeed;
    private readonly scale = 35;
    private slowMult = 1;
    private xVel = 0;
    private yVel = 0;
    private x = 0;
    private y = 0;
    private lockMove = false;
    private readonly TICK = 1000 / 9;
    spikeCollision = false;

    reset(client: PlayerClient, dir: number | null = null) {
        this.slowMult = 1;
        this.xVel = 0;
        this.yVel = 0;

        const speed = client.myPlayer.speed / this.TICK;
        const moveDir = dir ?? client._ModuleHandler.move_dir;
        if (moveDir !== null) {
            this.xVel = Math.cos(moveDir) * speed;
            this.yVel = Math.sin(moveDir) * speed;
        }
        const pos = client.myPlayer.pos.current;
        this.x = pos.x;
        this.y = pos.y;
        this.lockMove = false;
        this.spikeCollision = false;
    }

    getPos() {
        return new Vector(this.x, this.y);
    }

    getSpeed() {
        return new Vector(this.xVel, this.yVel).length * this.TICK;
    }

    private checkCollision(player: Player, target: PlayerObject | Resource | Player, delta: number, isEnemyObject: boolean) {
		delta = delta || 1;

        const pos1 = this.getPos();
        const pos2 = target.pos.current.copy();
        const distance = pos1.distance(pos2);
		const collisionRange = player.collisionScale + target.collisionScale + 5;
        if (distance > collisionRange) return false;
        
        const scale = player.collisionScale + target.collisionScale;
        const isPlayer = target instanceof Player;
        if (isPlayer || !target.canMoveOnTop()) {
            const tmpDir = getAngle(pos2.x, pos2.y, pos1.x, pos1.y);
            if (isPlayer) {
                const tmpInt = (distance - scale) * -1 / 2;
                this.x += tmpInt * Math.cos(tmpDir);
                this.y += tmpInt * Math.sin(tmpDir);
            } else {
                this.x = pos2.x + collisionRange * Math.cos(tmpDir);
                this.y = pos2.y + collisionRange * Math.sin(tmpDir);
                this.xVel *= 0.75;
                this.yVel *= 0.75;
            }
            if (target instanceof Resource && target.isCactus || target instanceof PlayerObject && target.isSpike && isEnemyObject) {
                const tmpSpd = 1.5 * 1;
                this.xVel += tmpSpd * Math.cos(tmpDir);
                this.yVel += tmpSpd * Math.sin(tmpDir);
                this.spikeCollision = true;
            }
        } else if (target.type === EItem.PIT_TRAP && isEnemyObject) {
            this.lockMove = true;
        } else if (target.type === EItem.BOOST_PAD) {
            const data = Items[target.type];
            const weight = 1;
            this.xVel += delta * data.boostSpeed * weight * Math.cos(target.angle);
            this.yVel += delta * data.boostSpeed * weight * Math.sin(target.angle);
        }
        return true;
	}

    collisionSimulation(client: PlayerClient) {
        this.reset(client);

        if (!settings._safeWalk) return false;
        
        this.update(client, false);
        if (this.spikeCollision) return true;

        this.update(client, true);
        return this.spikeCollision;
    }

    // movementSimulation(client: PlayerClient, dir: number | null = null) {
    //     this.reset(client, dir);

    //     const copy_dir = client.ModuleHandler.move_dir;
    //     client.ModuleHandler.move_dir = dir;
    //     this.update(client, false);
    //     client.ModuleHandler.move_dir = copy_dir;
    // }

    update(client: PlayerClient, notMoving: boolean) {
        const delta = 1000 / 9;
        if (this.slowMult < 1) {
            this.slowMult = Math.min(1, this.slowMult + 0.0008 * delta);
        }

        const { _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = client;
        const { autoHat } = ModuleHandler.staticModules;
        const pos = this.getPos();
        const skin = Hats[autoHat.getNextHat()];
        const tail = Accessories[autoHat.getNextAcc()];
        const weapon = DataHandler.getWeapon(autoHat.getNextWeaponID());
        const weaponSpd = weapon.spdMult || 1;
        const skinSpd = "spdMult" in skin ? skin.spdMult : 1;
        const tailSpd = "spdMult" in tail ? tail.spdMult : 1;

        const inSnow = pos.y <= Config.snowBiomeTop && !("coldM" in skin);
        const snowMult = inSnow ? Config.snowSpeed : 1;
        const buildMult = autoHat.getNextItemID() >= 0 ? 0.5 : 1;

        if (this.lockMove) {
			this.xVel = 0;
			this.yVel = 0;
		} else {
            let spdMult =
                buildMult *
                weaponSpd *
                skinSpd *
                tailSpd *
                snowMult *
                this.slowMult;

            const riverMin = Config.mapScale / 2 - Config.riverWidth / 2
            const riverMax = Config.mapScale / 2 + Config.riverWidth / 2
            const inRiver = !myPlayer.onPlatform && pos.y >= riverMin && pos.y <= riverMax;

            if (inRiver) {
                if ("watrImm" in skin) {
                    spdMult *= 0.75
                    this.xVel += Config.waterCurrent * 0.4 * delta
                } else {
                    spdMult *= 0.33
                    this.xVel += Config.waterCurrent * delta
                }
            }

            const moveDir = client._ModuleHandler.move_dir;
            let xDir = !notMoving && moveDir !== null ? Math.cos(moveDir) : 0;
            let yDir = !notMoving && moveDir !== null ? Math.sin(moveDir) : 0;

            const len = Math.sqrt(xDir * xDir + yDir * yDir);
            if (len !== 0) {
                xDir /= len;
                yDir /= len;
            }

            const accel = this.speed * spdMult * delta;
            if (xDir) this.xVel += xDir * accel;
            if (yDir) this.yVel += yDir * accel;
        }
        this.lockMove = false;

        const moveDist = getDistance(0, 0, this.xVel * delta, this.yVel * delta);
        const depth = Math.min(4, Math.max(1, Math.round(moveDist / 40)));
        const stepMult = 1 / depth;

        for (let i = 0; i < depth; i++) {
            if (this.xVel) this.x += this.xVel * delta * stepMult;
            if (this.yVel) this.y += this.yVel * delta * stepMult;
            
            client.ObjectManager.grid2D.query(this.x, this.y, 1, (id: number) => {
                const object = client.ObjectManager.objects.get(id)!;
                const isPlayerObject = object instanceof PlayerObject;
                const isEnemyObject = !isPlayerObject || client.PlayerManager.isEnemyByID(object.ownerID, client.myPlayer);
                this.checkCollision(myPlayer, object, stepMult, isEnemyObject);
            })
        }
        
        const nearestEnemy = client.EnemyManager.nearestEnemy;
        if (nearestEnemy !== null) {
            this.checkCollision(myPlayer, nearestEnemy, 1, false);
        }

        if (this.xVel) {
            this.xVel *= Math.pow(Config.playerDecel, delta);
            if (this.xVel >= -0.01 && this.xVel <= 0.01) this.xVel = 0;
        }

        if (this.yVel) {
            this.yVel *= Math.pow(Config.playerDecel, delta);
            if (this.yVel >= -0.01 && this.yVel <= 0.01) this.yVel = 0;
        }

        this.x = clamp(this.x, this.scale, Config.mapScale - this.scale);
        this.y = clamp(this.y, this.scale, Config.mapScale - this.scale);
    }
}