import GameUI from "../UI/GameUI";
import { ItemGroups, Items, WeaponVariants, Weapons } from "../constants/Items";
import Vector from "../modules/Vector";
import type { TResource } from "../types/Common";
import { EItem, EWeapon, ItemGroup, ItemType, type TInventory, type TPlaceable, WeaponType } from "../types/Items";
import { EHat, EStoreType } from "../types/Store";
import { clamp, inRange } from "../utility/Common";
import settings from "../utility/Settings";
import Player from "./Player";
import { Accessories, Hats } from "../constants/Store";
import PlayerClient from "../PlayerClient";
import DataHandler from "../utility/DataHandler";
import { PlayerObject } from "./ObjectItem";
import UI from "../UI/UI";
import Logger from "../utility/Logger";
import MovementSimulation from "../modules/MovementSimulation";

interface IWeaponXP {
    current: number;
    max: number;
}

/**
 * Represents my player. Contains all data that are related to the game bundle and websocket
 */
class ClientPlayer extends Player {

    private readonly inventory = {} as TInventory;
    readonly weaponXP = [{}, {}] as [IWeaponXP, IWeaponXP];

    /**
     * Current count of placed items grouped by type
     */
    readonly itemCount = new Map<ItemGroup, number>;

    /**
     * My player's current resources
     */
    readonly resources = {} as { [key in TResource]: number };
    tempGold = 0;

    readonly deathPosition = new Vector;
    readonly teleportPos = new Vector;
    teleported = false;

    /** true if my player is in game */
    inGame = false;
    wasDead = true;
    diedOnce = false;

    // timerCount = 0;//1000 / 9;

    /**
     * A Set of teammate IDs
     */
    readonly teammates = new Set<number>();

    /**
     * Shows how much gold the mills produce
     */
    totalGoldAmount = 0;
    age = 1;
    upgradeAge = 1;
    prevKills = 0;
    
    underTurretAttack = false;
    private readonly upgradeOrder: number[] = [];
    private upgradeIndex = 0;
    readonly joinRequests: [number, string][] = [];
    killedSomeone = false;
    actuallyKilledSomeone = false;

    totalKills = 0;
    deaths = 0;

    readonly simulation = new MovementSimulation();

    constructor(client: PlayerClient) {
        super(client);
        this.reset(true);
    }

    /**  if ID is ID of my player */
    isMyPlayerByID(id: number) {
        return id === this.id;
    }

    /** Checks if the ID belongs to the teammate */
    isTeammateByID(id: number) {
        return this.teammates.has(id);
    }

    /** Checks if the ID belongs to the enemy */
    isEnemyByID(id: number) {
        return !this.isMyPlayerByID(id) && !this.isTeammateByID(id);
    }

    /** true if connected to the sandbox */
    get isSandbox() {
        return /sandbox/.test(location.hostname) || this.client.SocketManager.isSandbox;
    }

    /** Returns current inventory weapon or item by type */
    getItemByType<T extends WeaponType | ItemType>(type: T) {
        return this.inventory[type];
    }

    /** Checks if item has enough resources to be used */
    private hasResourcesForType(type: ItemType): boolean {
        if (this.isSandbox) return true;

        const res = this.resources;
        const { food, wood, stone, gold } = Items[this.getItemByType(type)!].cost;
        return (
            res.food >= food &&
            res.wood >= wood &&
            res.stone >= stone &&
            res.gold >= gold
        )
    }

    /**
     * Returns current and max count of object
     */
    getItemCount(group: ItemGroup) {
        const item = ItemGroups[group];
        return {
            count: this.itemCount.get(group) || 0,
            limit: this.isSandbox ? ("sandboxLimit" in item ? item.sandboxLimit : 99) : item.limit
        } as const;
    }

    /**
     * Checks if my player can place item by type
     * 
     * Automatically ignores food and returns true
     */
    private hasItemCountForType(type: ItemType): boolean {
        if (type === ItemType.FOOD) return true;

        const item = Items[this.getItemByType(type)!];
        const { count, limit } = this.getItemCount(item.itemGroup);
        return count < limit;
    }

    /** Returns true if myPlayer is capable of using item */
    canPlace(type: ItemType | null): type is ItemType {
        return (
            type !== null &&
            this.getItemByType(type) !== null &&
            this.hasResourcesForType(type) &&
            this.hasItemCountForType(type)
        )
    }

    canPlaceObject(type: Exclude<ItemType, ItemType.FOOD>, angle: number): boolean {
        const { myPlayer: myPlayer, ObjectManager } = this.client;
        const id = myPlayer.getItemByType(type)!;
        const current = myPlayer.getPlacePosition(myPlayer.pos.current, id, angle);
        return ObjectManager.canPlaceItem(id, current);
    }

    /**
     * Returns the best destroying weapon depending on the inventory
     * 
     * `null`, if player have stick and does not have a hammer
     */
    getBestDestroyingWeapon(target: PlayerObject | null = null): WeaponType | null {
        const primaryID = this.getItemByType(WeaponType.PRIMARY);
        const primary = DataHandler.getWeapon(primaryID);
        const secondaryID = this.getItemByType(WeaponType.SECONDARY);
        const isHammer = secondaryID === EWeapon.GREAT_HAMMER;
        const notStick = primary.damage !== 1;
        const notPolearm = primaryID !== EWeapon.POLEARM;
        // const isKatana = primaryID === EWeapon.SHORT_SWORD || primaryID === EWeapon.KATANA;
        const { reloading } = this.client._ModuleHandler.staticModules;

        const primaryDamage = this.getBuildingDamage(primaryID, false);
        if (
            isHammer && notStick && notPolearm &&
            (!reloading.isReloaded(WeaponType.SECONDARY) || reloading.isFasterThan(WeaponType.PRIMARY, WeaponType.SECONDARY)) &&
            reloading.isReloaded(WeaponType.PRIMARY) &&
            target != null &&
            primaryDamage >= target.health
        ) {
            return WeaponType.PRIMARY;
        }

        if (
            target != null &&
            isHammer && notStick && notPolearm &&
            this.isTrapped
        ) {
            const hammerRange = DataHandler.getWeapon(secondaryID).range + target.hitScale + 1;
            const primaryRange = primary.range + target.hitScale;
            const pos1 = this.pos.current;
            const pos2 = target.pos.current;
            const distance = pos1.distance(pos2);
            if (inRange(distance, hammerRange, primaryRange)) {
                return WeaponType.PRIMARY;
            }
        }

        if (isHammer) return WeaponType.SECONDARY;
        if (notStick) return WeaponType.PRIMARY;
        return null;
    }

    getWeaponRangeByType(type: WeaponType) {
        const item = this.getItemByType(type)!;
        if (DataHandler.isMelee(item)) {
            return DataHandler.getWeapon(item).range;
        }
        return 0;
    }

    getFastestWeapon() {
        const primary = DataHandler.getWeapon(this.getItemByType(WeaponType.PRIMARY));
        const secondaryID = this.getItemByType(WeaponType.SECONDARY);
        if (secondaryID === null) return WeaponType.PRIMARY;
        const secondary = DataHandler.getWeapon(secondaryID);
        if (primary.spdMult > secondary.spdMult) return WeaponType.PRIMARY;
        return WeaponType.SECONDARY;
    }

    getDmgOverTime() {
        const hat = Hats[this.hatID];
        const accessory = Accessories[this.accessoryID];
        let damage = 0;
        if ("healthRegen" in hat) {
            damage += hat.healthRegen;
        }

        if ("healthRegen" in accessory) {
            damage += accessory.healthRegen;
        }

        if (this.poisonCount !== 0) {
            damage += -5;
        }

        return Math.abs(damage);
    }

    getMaxWeaponRangeClient() {
        const primary = this.inventory[WeaponType.PRIMARY];
        const secondary = this.inventory[WeaponType.SECONDARY];
        const primaryRange = DataHandler.getWeapon(primary).range;
        if (DataHandler.isMelee(secondary)) {
            const range = DataHandler.getWeapon(secondary).range;
            if (range > primaryRange) {
                return range;
            }
        }
        return primaryRange;
    }

    getMaxRangeTypeDestroy() {
        const primaryID = this.inventory[WeaponType.PRIMARY];
        const secondaryID = this.inventory[WeaponType.SECONDARY];
        const primary = DataHandler.getWeapon(primaryID);
        if (DataHandler.isMelee(secondaryID)) {
            const secondary = DataHandler.getWeapon(secondaryID);
            if (secondaryID === EWeapon.GREAT_HAMMER && secondary.range > primary.range) {
                return {
                    type: WeaponType.SECONDARY,
                    range: secondary.range
                }
            }
        }
        
        if (primaryID !== EWeapon.STICK) {
            return {
                type: WeaponType.PRIMARY,
                range: primary.range,
            }
        }

        return null;
    }

    getPlacePosition(start: Vector, itemID: TPlaceable, angle: number): Vector {
        return start.addDirection(angle, this.getItemPlaceScale(itemID));
    }

    /** Called after all received packets. Player and animal positions have been updated */
    tickUpdate() {
        if (this.inGame && this.wasDead) {
            this.wasDead = false;
            this.prevKills = 0;
            this.onFirstTickAfterSpawn();
        }
        
        // this.timerCount += PlayerManager.step;
        // if (this.timerCount >= 1000) {
        //     this.timerCount = 0;
        //     this.poisonCount = Math.max(this.poisonCount - 1, 0);
        // }

        const { _ModuleHandler: ModuleHandler, PlayerManager } = this.client;
        this.killedSomeone = false;
        this.actuallyKilledSomeone = false;
        if (this.totalKills > this.prevKills) {
            this.prevKills = this.totalKills;
            this.killedSomeone = true;

            if (PlayerManager.prevPlayers.size !== 0) {
                this.actuallyKilledSomeone = true;
            }
        }
        ModuleHandler.postTick();
    }

    override updateHealth(health: number) {
        if (!this.inGame) return;
        
        super.updateHealth(health);

        if (this.shameActive) return;

        if (health < 100) {
            const { _ModuleHandler: ModuleHandler } = this.client;
            ModuleHandler.staticModules.shameReset.healthUpdate();
        }
    }

    playerInit(id: number) {
        this.id = id;
        const { PlayerManager } = this.client;
        if (!PlayerManager.playerData.has(id)) {
            PlayerManager.playerData.set(id, this);
        }
    }

    private onFirstTickAfterSpawn() {
        const { _ModuleHandler: ModuleHandler, isOwner } = this.client;
        const { mouse, staticModules } = ModuleHandler;
        // const hatStore = ModuleHandler.getHatStore();
        // const accStore = ModuleHandler.getAccStore();
        // ModuleHandler.equip(EStoreType.HAT, hatStore.best);
        // ModuleHandler.equip(EStoreType.ACCESSORY, accStore.best);

        ModuleHandler._equip(EStoreType.HAT, 0);
        ModuleHandler.updateAngle(mouse.sentAngle, true);
        if (!isOwner) {
            const owner = this.client.ownerClient;
            UI.updateBotOption(this.client, "title");
            owner.clientIDList.add(this.id);

            // staticModules.tempData.setWeapon(ModuleHandler.weapon);
            staticModules.tempData.setAttacking(owner._ModuleHandler.attacking);
            staticModules.tempData.setStore(EStoreType.HAT, owner._ModuleHandler.store[EStoreType.HAT].actual);
            staticModules.tempData.setStore(EStoreType.ACCESSORY, owner._ModuleHandler.store[EStoreType.ACCESSORY].actual);
        }
    }

    playerSpawn() {
        this.inGame = true;
    }

    isUpgradeWeapon(id: EWeapon) {
        const weapon = DataHandler.getWeapon(id);
        if ("upgradeOf" in weapon) {
            return this.inventory[weapon.itemType] === weapon.upgradeOf;
        }
        return true;
    }

    newUpgrade(points: number, age: number) {
        this.upgradeAge = age;
        if (points === 0 || age === 10) return;

        const ids: number[] = [];
        for (const weapon of Weapons) {
            if (weapon.age === age && this.isUpgradeWeapon(weapon.id)) {
                ids.push(weapon.id);
            }
        }

        for (const item of Items) {
            if (item.age === age) {
                ids.push(item.id + 16);
            }
        }

        if (!this.client.isOwner) {
            const id = this.client.ownerClient.myPlayer.upgradeOrder[this.upgradeIndex];
            if (id !== undefined && ids.includes(id)) {
                this.upgradeIndex += 1;
                this.client._ModuleHandler._upgradeItem(id);
            }
        }
    }

    updateAge(age: number) {
        this.age = age;
    }

    upgradeItem(id: number) {
        this.upgradeOrder.push(id);

        const { isOwner, clients } = this.client;
        if (isOwner) {
            for (const client of clients) {
                const { age, upgradeAge } = client.myPlayer;
                if (age > this.upgradeAge) {
                    client.myPlayer.newUpgrade(1, upgradeAge);
                }
            }
        }

        if (id < 16) {
            const weapon = DataHandler.getWeapon(id)!;
            this.inventory[weapon.itemType] = id as EWeapon & null;
            const XP = this.weaponXP[weapon.itemType];
            XP.current = 0;
            XP.max = -1;
        } else {
            id -= 16;
            const item = Items[id]!;
            this.inventory[item.itemType] = id as EItem & null;
        }

        this.upgradeAge += 1;
    }

    updateClanMembers(teammates: (string | number)[]) {
        this.teammates.clear();
        for (let i=0;i<teammates.length;i+=2) {
            const id = teammates[i + 0] as number;
            if (!this.isMyPlayerByID(id)) {
                this.teammates.add(id);
            }
        }
    }

    updateItemCount(group: ItemGroup, count: number) {
        this.itemCount.set(group, count);
        if (this.client.isOwner) GameUI.updateItemCount(group);
    }

    updateResources(type: TResource, amount: number) {
        const previousAmount = this.resources[type];
        this.resources[type] = amount;
        if (type === "gold") {
            this.tempGold = amount;
            return;
        }
        if (amount < previousAmount) return;
        const difference = amount - previousAmount;
        if (type === "kills") {
            this.totalKills += difference;
            this.client.StatsManager.kills = difference;
            this.client.StatsManager.totalKills = difference;
            this.client.ownerClient.StatsManager.globalKills = difference;
            if (this.client.isOwner) {
                GameUI.updateTotalKills(this.totalKills);
            }

            return;
        }

        this.updateWeaponXP(difference);
    }

    updateWeaponXP(amount: number) {
        const { next } = this.getWeaponVariant(this.weapon.current);
        const XP = this.weaponXP[DataHandler.getWeapon(this.weapon.current).itemType];
        const maxXP = WeaponVariants[next].needXP;

        XP.current += amount;
        if (XP.max !== -1 && XP.current >= XP.max) {
            XP.current -= XP.max;
            XP.max = maxXP;
            return;
        }

        if (XP.max === -1) {
            XP.max = maxXP;
        }

        if (XP.current >= XP.max) {
            XP.current -= XP.max;
            XP.max = -1;
        }
    }

    private resetResources() {
        this.resources.food = 100;
        this.resources.wood = 100;
        this.resources.stone = 100;
        this.resources.gold = 100;
        this.resources.kills = 0;
    }

    private resetInventory() {
        this.inventory[WeaponType.PRIMARY] = EWeapon.TOOL_HAMMER;
        this.inventory[WeaponType.SECONDARY] = null;
        this.inventory[ItemType.FOOD] = EItem.APPLE;
        this.inventory[ItemType.WALL] = EItem.WOOD_WALL;
        this.inventory[ItemType.SPIKE] = EItem.SPIKES;
        this.inventory[ItemType.WINDMILL] = EItem.WINDMILL;
        this.inventory[ItemType.FARM] = null;
        this.inventory[ItemType.TRAP] = null;
        this.inventory[ItemType.TURRET] = null;
        this.inventory[ItemType.SPAWN] = null;
    }

    private resetWeaponXP() {
        for (const XP of this.weaponXP) {
            XP.current = 0;
            XP.max = -1;
        }
    }

    spawn(customName?: any) {
        let name = customName || window.localStorage.getItem("moo_name") || "";
        if (!this.client.isOwner && !customName) {
            const names = [
                "Glotus Bot", "MooMoo Hero", "Silent Assassin", "Fast Picker", 
                "Wood Master", "Stone Cold", "Gold Digger", "Bot 9000",
                "Alpha Bot", "Beta Bot", "Gamma Bot", "Delta Bot",
                "Speedy", "Tanky", "Ninja", "Ghost", "Striker"
            ];
            name = names[Math.floor(Math.random() * names.length)];
        }
        const skin = Number(window.localStorage.getItem("skin_color")) || 0;
        this.client.PacketManager.spawn(name, 1, skin === 10 ? "constructor" : skin);
    }

    handleJoinRequest(id: number, name: string) {
        this.joinRequests.push([id, name]);
    }

    /** Resets player data. Called when myPlayer died */
    reset(first = false) {
        this.resetResources();
        this.resetInventory();
        this.resetWeaponXP();

        const { _ModuleHandler: ModuleHandler, PlayerManager } = this.client;
        ModuleHandler.reset();

        this.inGame = false;
        this.wasDead = true;
        this.upgradeOrder.length = 0;
        this.upgradeIndex = 0;
        
        if (first) return;
        this.previousHealth = 100;
        this.currentHealth = 100;
        this.tempHealth = 100;
        this.shameActive = false;
        this.shameCount = 0;
        this.shameTimer = 0;

        this.deathPosition.setVec(this.pos.current);
        this.diedOnce = true;
        this.client.StatsManager.deaths = 1;
        this.deaths += 1;

        if (this.client.isOwner) {
            GameUI.reset();
            GameUI.updateTotalDeaths(this.deaths);
        }
    }
}

export default ClientPlayer;