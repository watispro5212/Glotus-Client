import PlayerClient from "../PlayerClient";
import Animals, { EAnimal } from "../constants/Animals";
import Config from "../constants/Config";
import { ItemGroup } from "../types/Items";
import Entity from "./Entity";

/** Animal class. Represents all animals including bosses */
class Animal extends Entity {
    type!: EAnimal;
    prevHealth = 0;
    currentHealth = 0;
    receivedDamage = 0;
    maxHealth = 0;
    isDanger = false;
    isHostile = false;
    readonly isPlayer = false;
    
    constructor(client: PlayerClient) {
        super(client);
    }

    canBeTrapped() {
        return !("noTrap" in Animals[this.type]);
    }

    update(
        id: number,
        type: EAnimal,
        x: number,
        y: number,
        angle: number,
        health: number,
        nameIndex: number
    ) {
        this.id = id;
        this.type = type;

        this.pos.previous.setVec(this.pos.current);
        this.pos.current.setXY(x, y);
        this.setFuturePosition();

        const animal = Animals[type];
        this.angle = angle;
        this.prevHealth = this.currentHealth;
        this.currentHealth = health;
        this.maxHealth = animal.health;
        nameIndex;
        this.scale = animal.scale;
        
        const isHostile = animal.hostile && type !== EAnimal.TREASURE;
        // const isTrapped = this.canBeTrapped() && this.checkCollision(ItemGroup.TRAP);
        this.isHostile = animal.hostile;
        this.isDanger = isHostile;// && !isTrapped;

        this.receivedDamage = 0;
        const difference = Math.abs(this.currentHealth - this.prevHealth);
        if (this.currentHealth < this.prevHealth) {
            this.receivedDamage = difference;
        }
    }

    get attackRange() {
        if (this.type === EAnimal.MOOSTAFA) {
            return Animals[this.type].hitRange + Config.playerScale;
        }
        return this.scale;
    }
    
    get collisionRange() {
        if (this.type === EAnimal.MOOSTAFA) {
            return Animals[this.type].hitRange + Config.playerScale;
        }
        return this.scale + 60;
    }

    get canUseTurret() {
        return this.isHostile;
    }
}

export default Animal;