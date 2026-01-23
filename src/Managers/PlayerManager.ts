import { Glotus } from "..";
import Config from "../constants/Config";
import Animal from "../data/Animal";
import ClientPlayer from "../data/ClientPlayer";
import { PlayerObject, Resource, type TObject } from "../data/ObjectItem";
import Player from "../data/Player";
import DeadPlayer, { DeadPlayerHandler } from "../modules/DeadPlayer";
import type Vector from "../modules/Vector";
import PlayerClient from "../PlayerClient";
import type { TTarget } from "../types/Common";
import { EResourceType } from "../types/Enums";
import { EItem, EWeapon, type TMelee} from "../types/Items";
import { EHat } from "../types/Store";
import { getAngleDist } from "../utility/Common";
import DataHandler from "../utility/DataHandler";
import settings from "../utility/Settings";

interface IPlayerData {
    readonly socketID?: string;
    readonly id: number;
    readonly nickname?: string;
    readonly health?: number;
    readonly skinID?: number;
}

class PlayerManager {

    /** A Map of all known players in the game */
    readonly playerData: Map<number, Player> = new Map;

    /** An array of players, that are visible to my player */
    readonly players: Player[] = [];
    readonly enemies: Player[] = [];
    prevPlayers = new Set<Player>();

    /** A Map of all known animals in the game */
    readonly animalData: Map<number, Animal> = new Map;

    /** Represents existing clans, string = clanName, number = ownerID */
    readonly clanData = new Map<string, number>();

    start = Date.now();

    /** A time between current and previous `MOVE_UPDATE` packet */
    step = 0;

    readonly damagesByHits: [Player, TMelee][] = [];
    readonly lastEnemyReceivedDamage: [number, number] = [0, 0];
    nearestTeammate: Player | null = null;

    private readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    get timeSinceTick() {
        return Date.now() - this.start;
    }

    getEntity(id: number, isPlayer: boolean): Player | Animal | null {
        if (isPlayer && this.playerData.has(id)) {
            return this.playerData.get(id)!;
        } else if (!isPlayer && this.animalData.has(id)) {
            return this.animalData.get(id)!;
        }

        return null;
    }

    createPlayer({ socketID, id, nickname, health, skinID }: IPlayerData) {
        const { myPlayer } = this.client;
        if (socketID === this.client.clientID && myPlayer.id === -1) {
            myPlayer.playerInit(id);
        }
        
        const player = this.playerData.get(id) || new Player(this.client);
        if (!this.playerData.has(id)) {
            this.playerData.set(id, player);
        }

        player.id = id;
        player.prevNickname = player.nickname;
        player.nickname = nickname || "";
        player.currentHealth = health || 100;
        player.skinID = typeof skinID === "undefined" ? -1 : skinID;
        player.init();

        if (myPlayer.isMyPlayerByID(id)) {
            myPlayer.playerSpawn();
        }
        
        return player;
    }

    createClan(name: string, ownerID: number) {
        this.clanData.set(name, ownerID);
    }

    deleteClan(name: string) {
        this.clanData.delete(name);
    }

    clanExist(name: string | null) {
        return name !== null && this.clanData.has(name);
    }

    canHitTarget(player: Player, weaponID: TMelee, target: TTarget) {
        const pos = target.pos.current;
        const distance = player.pos.current.distance(pos);
        const angle = player.pos.current.angle(pos);
        const range = DataHandler.getWeapon(weaponID).range + target.hitScale;
        return distance <= range && getAngleDist(angle, player.angle) <= Config.gatherAngle;
    }

    attackPlayer(id: number, gathering: 0 | 1, weaponID: TMelee) {
        const player = this.playerData.get(id);
        if (player === undefined) return;
        const { hatID, reload } = player;

        const { myPlayer, ObjectManager } = this.client;
        player.lastAttacked = myPlayer.tickCount;
        
        const isMyPlayer = myPlayer.isMyPlayerByID(id);
        if (isMyPlayer && !myPlayer.inGame) {
            return;
        }
        
        // When player hits, we must reset his reload
        const weapon = DataHandler.getWeapon(weaponID);
        const type = weapon.itemType;
        player.updateMaxReload(reload[type], weaponID);
        player.resetCurrentReload(reload[type]);

        // const reduceDmg = myPlayer.hatID === EHat.SOLDIER_HELMET ? 0.75 : 1;
        // const damage = player.getMaxWeaponDamage(weaponID, false) * reduceDmg;

        if (myPlayer.isEnemyByID(id)) {

            // IF WE FOUND SOME HIT ANIMATION BY ENEMY
            // THEN TRY TO FIND IF WE RECEIVED SIMILAR DAMAGE
            // LOG IT, AND CLEAR DAMAGE CACHE
            // const index = myPlayer.damages.indexOf(damage);
            // if (index !== -1) {
            //     this.damagesByHits.push([player, weaponID]);
            //     myPlayer.damages.splice(index, 1);
            // }

            if (this.canHitTarget(player, weaponID, myPlayer)) {
                const { isAble, count } = player.canDealPoison(weaponID);
                if (isAble) {
                    myPlayer.poisonCount = count;
                }
            }
        }

        // Handle building HP and weaponXP
        if (gathering === 1) {
            const objects = ObjectManager.attackedObjects;
            for (const [id, data] of objects) {
                const [hitAngle, object] = data;
                if (this.canHitTarget(player, weaponID, object) && getAngleDist(hitAngle, player.angle) <= 1.25) {
                    objects.delete(id);

                    if (object instanceof PlayerObject) {
                        const damage = player.getBuildingDamage(weaponID);
                        object.health = Math.max(0, object.health - damage);
                    } else if (player === myPlayer) {
                        let amount = (hatID === EHat.MINERS_HELMET ? 1 : 0);
                        if (object.type === EResourceType.GOLD) {
                            amount += weapon.gather + 4;
                        }
                        myPlayer.updateWeaponXP(amount);
                    }
                }
            }
        }
    }

    updatePlayer(buffer: any[]) {
        // this.prevPlayers = new Set(this.players);
        this.players.length = 0;
        this.enemies.length = 0;
        this.damagesByHits.length = 0;
        this.nearestTeammate = null;

        const now = Date.now();
        this.step = now - this.start;
        this.start = now;

        const { myPlayer, isOwner, EnemyManager } = this.client;
        for (let i=0;i<buffer.length;i+=13) {
            const id = buffer[i];
            const player = this.playerData.get(id)!;
            // if (!player) continue;

            this.players.push(player);
            player.update(
                id,
                buffer[i + 1],
                buffer[i + 2],
                buffer[i + 3],
                buffer[i + 4],
                buffer[i + 5],
                buffer[i + 6],
                buffer[i + 7],
                buffer[i + 8],
                buffer[i + 9],
                buffer[i + 10]
            );

            // if (this.prevPlayers.has(player)) {
            //     this.prevPlayers.delete(player);
            // }
            // this.lastEnemyReceivedDamage[0] = 0;
            // this.lastEnemyReceivedDamage[1] = 0;

            if (
                !this.client.isBotByID(id) &&
                !myPlayer.isMyPlayerByID(id) &&
                myPlayer.isTeammateByID(id) &&
                EnemyManager.isNear(player, this.nearestTeammate, myPlayer)
            ) {
                this.nearestTeammate = player;
            } else if (myPlayer.isEnemyByID(id)) {
                this.enemies.push(player);
            }
        }

        // for (const player of this.prevPlayers) {
        //     player.updateStackedDamage();
        //     player.seenBefore = false;
        // }
    }

    updateAnimal(buffer: any[]) {

        const { EnemyManager } = this.client;
        for (let i=0;i<buffer.length;i+=7) {
            const id = buffer[i];
            if (!this.animalData.has(id)) {
                this.animalData.set(id, new Animal(this.client));
            }
            const animal = this.animalData.get(id)!;
            animal.update(
                id,
                buffer[i + 1],
                buffer[i + 2],
                buffer[i + 3],
                buffer[i + 4],
                buffer[i + 5],
                buffer[i + 6],
            );

            // if (animal.receivedDamage !== 0 && settings._stackedDamage) {
            //     const pos = animal.pos.current;
            //     Glotus.hooks.showText(pos.x, pos.y, animal.receivedDamage, 1, true);
            // }

            EnemyManager.handleAnimal(animal);
        }
    }

    postTick() {
        const { EnemyManager, ProjectileManager, ObjectManager, myPlayer, isOwner } = this.client;
        ProjectileManager.postTick();
        EnemyManager.handleEnemies(this.enemies);

        // Call all other classes after updating player and animal positions
        ObjectManager.postTick();

        // Once we updated every player, animal, turret reloadings we proceed to the combat logic
        if (myPlayer.inGame) {
            myPlayer.tickUpdate();
        }
        ObjectManager.deletedObjects.clear();

        // if (myPlayer.killedSomeone && this.prevPlayers.size !== 0) {
        //     for (const player of this.prevPlayers) {
        //         const isDead = player.currentHealth <= 0;
        //         if (isDead) {
        //             const deadPlayer = new DeadPlayer(
        //                 player.pos.current,
        //                 myPlayer.pos.current.angle(player.pos.current),
        //                 player.skinID,
        //                 player.angle,
        //                 player.weapon.current,
        //                 player.variant.current,
        //                 player.hatID,
        //                 player.accessoryID,
        //                 player.tickDamage,
        //             );
        //             DeadPlayerHandler.add(deadPlayer);
        //         }
        //         this.prevPlayers.delete(player);
        //     }
        // }

        if ((settings._autospawn || !isOwner) && !myPlayer.inGame) {
            myPlayer.spawn();
        }
    }

    /** Checks if players are enemies by their clan names. */
    isEnemy(target1: Player, target2: Player) {
        return (
            target1 == null || target2 == null ||
            target1 !== target2 && (
            target1.clanName === null ||
            target2.clanName === null ||
            target1.clanName !== target2.clanName)
        )
    }

    /** Checks if 2 entities are enemies to each other, globally */
    isEnemyByID(ownerID: number, target: Player) {
        const player = this.playerData.get(ownerID)!;

        if (player == null) {
            throw new Error("isEnemyByID Error: Failed to find an owner!");
        }

        if (player instanceof ClientPlayer) {
            return player.isEnemyByID(target.id);
        }

        if (target instanceof ClientPlayer) {
            return target.isEnemyByID(player.id);
        }
        
        return this.isEnemy(player, target);
    }

    isEnemyTarget(owner: Player, target: Player | Animal): boolean {
        if (target instanceof Animal) return true;
        return this.isEnemyByID(owner.id, target);
    }

    /** Returns true if the projectile won't pass through entity */
    canShoot(ownerID: number, target: Player | Animal) {
        return target instanceof Animal || this.isEnemyByID(ownerID, target);
    }

    canMoveOnTop(object: TObject) {
        if (object instanceof Resource) return false;
        const item = DataHandler.getItem(object.type);
        const isEnemyObject = this.isEnemyByID(object.ownerID, this.client.myPlayer);
        if ("ignoreCollision" in item && (object.type !== EItem.PIT_TRAP || !isEnemyObject)) {
            return true;
        }
        return false;
    }

    /** Returns true if player is looking at target using shield */
    lookingShield(owner: Player | Animal, target: Player): boolean {
        if (owner instanceof Animal) return false;
        
        const weapon = owner.weapon.current;
        if (weapon !== EWeapon.WOODEN_SHIELD) return false;
        
        const { myPlayer, ModuleHandler } = this.client;
        const pos1 = owner.pos.current;
        const pos2 = target.pos.current;
        const angle = pos1.angle(pos2);
        const ownerAngle = myPlayer.isMyPlayerByID(owner.id) ? ModuleHandler.mouse.sentAngle : owner.angle; 
        return getAngleDist(angle, ownerAngle) <= Config.shieldAngle;
    }

    /**
     * Returns current players and animals visible to my player
     */
    // getEntities(): (Player | Animal)[] {
    //     return [...this.players, ...this.animals];
    // }
}

export default PlayerManager;