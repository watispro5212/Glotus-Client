import PlayerClient from "../PlayerClient";
import { EAttack, ESentAngle } from "../types/Enums";
import { ItemType, ReloadType, WeaponType} from "../types/Items";
import { EHat, EStoreType } from "../types/Store";
import DataHandler from "../utility/DataHandler";
import AntiInsta from "./modules/AntiInsta";
import AutoPlacer from "./modules/AutoPlacer";
import Autohat from "./modules/Autohat";
import Automill from "./modules/Automill";
import Placer from "./modules/Placer";
import ShameReset from "./modules/ShameReset";
import UpdateAngle from "./modules/UpdateAngle";
import UpdateAttack from "./modules/UpdateAttack";
import ClanJoiner from "./bot-modules/ClanJoiner";
import Movement from "./bot-modules/Movement";
import AutoAccept from "./modules/AutoAccept";
import TempData from "./bot-modules/TempData";
import Reloading from "./modules/Reloading";
import Autobreak from "./modules/Autobreak";
import SpikeTick from "./modules/SpikeTick";
import PreAttack from "./modules/PreAttack";
import UseFastest from "./modules/UseFastest";
import SafeWalk from "./modules/SafeWalk";
import DefaultHat from "./modules/DefaultHat";
import DefaultAcc from "./modules/DefaultAcc";
import UtilityHat from "./modules/UtilityHat";
import UseDestroying from "./modules/UseDestroying";
import UseAttacking from "./modules/UseAttacking";
import SpikeSync from "./modules/SpikeSync";
import KnockbackTick from "./modules/KnockbackTick";
import KnockbackTickHammer from "./modules/KnockbackTickHammer";
import SpikeSyncHammer from "./modules/SpikeSyncHammer";
import KnockbackTickTrap from "./modules/KnockbackTickTrap";
import { reverseAngle } from "../utility/Common";
import Vector from "../modules/Vector";
import AutoSync from "./modules/AutoSync";
import GameUI from "../UI/GameUI";
import AutoBuy from "./modules/AutoBuy";
import AutoGrind from "./modules/AutoGrind";
import PathFinder from "./modules/PathFinder";
import VelocityTick from "./modules/VelocityTick";
import KBDefense from "./modules/KBDefense";

interface IStore {
    readonly utility: Map<number, boolean>;
    lastUtility: number | null;
    current: number;
    best: number;
    actual: number;
    last: number;
}

type TStore = [IStore, IStore];

type TBotModuleList = [
    TempData,
    ClanJoiner,
    Movement,
]

type TModuleList = [
    AutoAccept,
    AutoBuy,

    DefaultHat,
    DefaultAcc,
    SafeWalk,
    AntiInsta,
    ShameReset,
    PathFinder,
    
    Reloading,
    AutoSync,
    VelocityTick,
    SpikeSyncHammer,
    SpikeSync,
    SpikeTick,
    KnockbackTickTrap,
    KnockbackTickHammer,
    KnockbackTick,
    KBDefense,
    Autobreak,
    UseFastest,
    UseDestroying,
    UseAttacking,
    UtilityHat,

    AutoPlacer,
    Placer,
    Automill,
    AutoGrind,

    PreAttack,
    Autohat,

    UpdateAttack,
    UpdateAngle,
]

type TupleToObject<T extends { moduleName: string }[]> = {
    readonly [K in T[number]["moduleName"]]: Extract<T[number], { moduleName: K }>;
};

type TModules = [...TBotModuleList, ...TModuleList];
type TStaticModules = TupleToObject<TModules>;

class ModuleHandler {

    private readonly client: PlayerClient;

    readonly staticModules = {} as TStaticModules;
    private readonly botModules: TBotModuleList;
    private readonly modules: TModuleList;

    readonly store: TStore = [
        { utility: new Map, lastUtility: null, current: 0, best: 0, actual: -1, last: 0 },
        { utility: new Map, lastUtility: null, current: 0, best: 0, actual: -1, last: 0 },
    ];

    /** A ID list of bought hats and accessories */
    readonly bought = [
        new Set<number>,
        new Set<number>
    ] as const;

    readonly followTarget = new Vector(0, 0);
    readonly lookTarget = new Vector(0, 0);
    readonly endTarget = new Vector(0, 0);
    followPath = false;

    tickCount = 0;
    currentHolding: WeaponType | ItemType = WeaponType.PRIMARY;
    /** The type of weapon my player is holding */
    weapon!: WeaponType;

    /** Current type of item which is placing */
    currentType!: ItemType | null;

    /** true if myPlayer is attacking using left mouse button */
    attacking!: EAttack;
    attackingState!: EAttack;

    sentAngle!: ESentAngle;
    sentHatEquip!: boolean;
    sentAccEquip!: boolean;

    /** myPlayer is going to be instakilled, we need to heal */
    needToHeal!: boolean;

    /** true, if tried to outheal instakill */
    didAntiInsta!: boolean;

    /** true if used placement method at least once at current tick */
    placedOnce!: boolean;
    healedOnce!: boolean;
    totalPlaces!: number;
    attacked!: boolean;
    canHitEntity = false;

    /** true, if some of combat or defensive modules are active */
    moduleActive = false;
    useAngle: number | null = null;
    useWeapon: WeaponType | null = null;
    useItem: ItemType | null = null;
    forceWeapon: WeaponType | null = null;
    useHat: number | null = null;
    forceHat: number | null = null;
    useAcc: number | null = null;
    previousWeapon: WeaponType | null = null;

    /** Current mouse angle, including lock rotation */
    currentAngle = 0;
    move_dir: number | null = null;
    reverse_move_dir: number | null = null;
    moveTo: number | null | "disable" = "disable";
    prevMoveTo: number | null | "disable" = "disable";

    /** true, if player is autoattacking */
    autoattack = false;
    shouldAttack = false;

    public readonly mouse = {

        /** An angle that was sent to the server */
        sentAngle: 0,
    }


    constructor(client: PlayerClient) {
        this.client = client;

        this.staticModules = {
            tempData: new TempData(client),
            movement: new Movement(client),
            clanJoiner: new ClanJoiner(client),

            autoAccept: new AutoAccept(client),
            autoBuy: new AutoBuy(client),

            defaultHat: new DefaultHat(client),
            defaultAcc: new DefaultAcc(client),
            safeWalk: new SafeWalk(client),
            antiInsta: new AntiInsta(client),
            shameReset: new ShameReset(client),
            pathFinder: new PathFinder(client),
            
            reloading: new Reloading(client),
            autoSync: new AutoSync(client),
            velocityTick: new VelocityTick(client),
            spikeSyncHammer: new SpikeSyncHammer(client),
            spikeSync: new SpikeSync(client),
            spikeTick: new SpikeTick(client),
            knockbackTickTrap: new KnockbackTickTrap(client),
            knockbackTick: new KnockbackTick(client),
            knockbackTickHammer: new KnockbackTickHammer(client),
            kbDefense: new KBDefense(client),
            autoBreak: new Autobreak(client),
            useFastest: new UseFastest(client),
            useDestroying: new UseDestroying(client),
            useAttacking: new UseAttacking(client),
            utilityHat: new UtilityHat(client),
            
            autoPlacer: new AutoPlacer(client),
            placer: new Placer(client),
            autoMill: new Automill(client),
            autoGrind: new AutoGrind(client),

            preAttack: new PreAttack(client),
            autoHat: new Autohat(client),
        
            updateAttack: new UpdateAttack(client),
            updateAngle: new UpdateAngle(client),
        };

        this.botModules = [
            this.staticModules.tempData,
            this.staticModules.clanJoiner,
            this.staticModules.movement,
        ];

        this.modules = [
            this.staticModules.autoAccept,
            this.staticModules.autoBuy,

            this.staticModules.defaultHat,
            this.staticModules.defaultAcc,
            this.staticModules.safeWalk,
            this.staticModules.antiInsta,
            this.staticModules.shameReset,
            this.staticModules.pathFinder,
            
            this.staticModules.reloading,
            this.staticModules.autoSync,
            this.staticModules.velocityTick,
            this.staticModules.spikeSyncHammer,
            this.staticModules.spikeSync,
            this.staticModules.spikeTick,
            this.staticModules.knockbackTickTrap,
            this.staticModules.knockbackTickHammer,
            this.staticModules.knockbackTick,
            this.staticModules.kbDefense,
            this.staticModules.autoBreak,
            this.staticModules.useFastest,
            this.staticModules.useDestroying,
            this.staticModules.useAttacking,
            this.staticModules.utilityHat,
            
            this.staticModules.autoPlacer,
            this.staticModules.placer,
            this.staticModules.autoMill,
            this.staticModules.autoGrind,

            this.staticModules.preAttack,
            this.staticModules.autoHat,

            this.staticModules.updateAttack,
            this.staticModules.updateAngle,
        ];
        this.reset();
    }

    private movementReset() {
        this.currentHolding = WeaponType.PRIMARY;
        this.weapon = WeaponType.PRIMARY;
        this.currentType = null;
        this.attacking = EAttack.DISABLED;
        this.attackingState = EAttack.DISABLED;
        this.move_dir = null;
        this.reverse_move_dir = null;
    }
    
    reset(): void {
        const { isOwner, clients } = this.client;
        this.movementReset();
        this.getHatStore().utility.clear();
        this.getAccStore().utility.clear();
        this.sentAngle = ESentAngle.NONE;
        this.sentHatEquip = false;
        this.sentAccEquip = false;
        this.needToHeal = false;
        this.didAntiInsta = false;
        this.placedOnce = false;
        this.healedOnce = false;
        this.totalPlaces = 0;
        this.attacked = false;
        this.canHitEntity = false;
        this.autoattack = false;

        for (const module of this.modules) {
            if ("reset" in module) {
                module.reset();
            }
        }

        if (isOwner) {
            for (const client of clients) {
                client.ModuleHandler.movementReset();
                client.ModuleHandler.toggleAutoattack(false);
            }
        }
    }

    get holdingWeapon(): boolean {
        return this.currentHolding <= WeaponType.SECONDARY;
    }

    get isForcedHat() {
        return this.forceHat !== null;
    }

    get isMoving() {
        return this.move_dir !== null;
    }

    getHatStore() {
        return this.store[EStoreType.HAT];
    }

    getAccStore() {
        return this.store[EStoreType.ACCESSORY];
    }

    setFollowTarget(x: number, y: number) {
        this.followTarget.setXY(x, y);
    }

    setLookTarget(x: number, y: number) {
        this.lookTarget.setXY(x, y);
    }

    private updateSentAngle(priority: ESentAngle) {
        if (this.sentAngle >= priority) return;
        this.sentAngle = priority;
    }

    upgradeItem(id: number) {
        this.client.PacketManager.upgradeItem(id);
        this.client.myPlayer.upgradeItem(id);
    }

    startMovement(angle: number | null = this.move_dir, ignore = false) {
        if (!ignore) {
            this.move_dir = angle;
            this.reverse_move_dir = angle === null ? null : reverseAngle(angle);
        }

        const { safeWalk } = this.staticModules;
        if (
            safeWalk.willGetHit(angle, 45) ||
            !ignore && this.moveTo !== "disable"
        ) return false;

        this.client.PacketManager.move(angle);
        return true;
    }

    stopMovement() {
        this.client.PacketManager.resetMoveDir();
    }

    startPlacement(type: ItemType | null) {
        this.currentType = type;
    }

    canBuy(type: EStoreType, id: number): boolean {
        if (id === -1) return false;
        const store = DataHandler.getStore(type);
        // @ts-ignore
        const price = store[id].price;
        const bought = this.bought[type];
        return bought.has(id) || this.client.myPlayer.tempGold >= price;
    }

    /** Buys a hat or accessory and returns true if it was successful */
    buy(type: EStoreType, id: number, force = false): boolean {
        const store = DataHandler.getStore(type);
        const { isOwner, clients, myPlayer, PacketManager } = this.client;
        if (!myPlayer.inGame) return false;

        if (force) {
            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.buy(type, id, force);
                }
            }
        }

        // @ts-ignore
        const price = store[id].price;
        const bought = this.bought[type];

        if (price === 0) {
            bought.add(id);
            return true;
        }
        
        if (!bought.has(id) && myPlayer.tempGold >= price) {
            // bought.add(id);
            PacketManager.buy(type, id);
            myPlayer.tempGold -= price;
            return false;
        }
        return bought.has(id);
    }
    
    /** Buys and equips a hat or accessory */
    equip(type: EStoreType, id: number, force = false, toggle = false): boolean {
        const store = this.store[type];
        const { myPlayer, PacketManager, EnemyManager, isOwner, clients } = this.client;
        if (toggle && store.last === id && id !== 0) {
            id = 0;
        }
        if (!myPlayer.inGame || !this.buy(type, id, force)/*  || store.last === id */) return false;
        if (store.last === id && myPlayer.storeData[type] === id) return false;
        // TODO: Improve the way store handles hat equipment between forced and automatic type
        // if (!force) {
        //     if (store.current === id) return false;
        //     store.current = id;
        // }

        store.last = id;
        PacketManager.equip(type, id);

        if (type === EStoreType.HAT) {
            this.sentHatEquip = true;
        } else {
            this.sentAccEquip = true;
        }

        if (force) {
            store.actual = id;
            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.staticModules.tempData.setStore(type, id);
                }
            }
        }

        const nearest = EnemyManager.nearestTurretEntity;
        const reloading = this.staticModules.reloading;
        if (nearest !== null && reloading.isReloaded(ReloadType.TURRET) && type === EStoreType.HAT && id === EHat.TURRET_GEAR) {
            reloading.resetByType(ReloadType.TURRET);
        }
        return true;
    }

    updateAngle(angle: number, force = false) {
        if (!force && angle === this.mouse.sentAngle) return;
        this.mouse.sentAngle = angle;
        this.updateSentAngle(ESentAngle.HIGH);
        this.client.PacketManager.updateAngle(angle);
    }

    selectItem(type: ItemType) {
        const item = this.client.myPlayer.getItemByType(type)!;
        this.client.PacketManager.selectItemByID(item, false);
        this.currentHolding = type;
    }

    attack(angle: number | null, priority = ESentAngle.MEDIUM) {
        if (angle !== null) {
            this.mouse.sentAngle = angle;
        }
        this.updateSentAngle(priority);
        this.client.PacketManager.attack(angle);

        if (this.holdingWeapon) {
            this.attacked = true;
        }
    }

    stopAttack() {
        this.client.PacketManager.stopAttack();
    }

    toggleAutoattack(state = !this.autoattack) {
        const { PacketManager, isOwner, clients } = this.client;
        if (this.attackingState !== EAttack.DISABLED) return;
        this.autoattack = state;
        PacketManager.autoAttack();

        // if (isOwner) {
        //     for (const client of clients) {
        //         client.ModuleHandler.toggleAutoattack(state);
        //     }
        // }
    }

    whichWeapon(type: WeaponType = this.weapon) {
        const weapon = this.client.myPlayer.getItemByType(type);
        if (weapon === null) return;

        this.currentHolding = type;
        this.weapon = type;
        this.client.PacketManager.selectItemByID(weapon, true);
    }

    place(type: ItemType, angle = this.currentAngle) {
        this.totalPlaces += 1;
        this.selectItem(type);
        this.attack(angle, ESentAngle.LOW);
        this.whichWeapon();
    }

    heal() {
        this.selectItem(ItemType.FOOD);
        this.attack(null, ESentAngle.LOW);
        this.whichWeapon();
    }

    colls: number[] = [];

    circleOffset = 0;
    targetSpeed = 0.3;
    circleRadius = 400;
    
    postTick() {
        const rotationSpeed = this.targetSpeed / this.circleRadius;
        this.circleOffset += rotationSpeed;
        const { isOwner, ObjectManager, myPlayer } = this.client;
        // const { x, y } = myPlayer.pos.current;
        // const ids: number[] = [];
        // ObjectManager.grid2D.query(x, y, 2, (id: number) => {
        //     ids.push(id);
        // });
        // this.colls = ids;

        this.tickCount += 1;
        this.sentAngle = ESentAngle.NONE;
        this.sentHatEquip = false;
        this.sentAccEquip = false;
        this.didAntiInsta = false;
        this.placedOnce = false;
        this.healedOnce = false;
        this.totalPlaces = 0;
        this.attacked = false;
        this.canHitEntity = false;
        this.moduleActive = false;
        this.useWeapon = null;
        this.useItem = null;
        this.forceWeapon = null;
        this.useHat = null;
        this.forceHat = null;
        this.useAcc = null;
        this.useAngle = null;
        this.shouldAttack = false;
        this.prevMoveTo = this.moveTo;
        this.moveTo = "disable";

        if (!isOwner) {
            for (const botModule of this.botModules) {
                botModule.postTick();
            }
        }

        for (const module of this.modules) {
            module.postTick();
        }
        this.attackingState = this.attacking;
        if (isOwner) {
            this.client.InputHandler.postTick();
            GameUI.updateFastQ(this.didAntiInsta);
            GameUI.updateTotalPlaces(this.totalPlaces);
        }
    }
}

export default ModuleHandler;