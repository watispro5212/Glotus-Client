class Vector {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromAngle(angle: number, length = 1) {
        return new Vector(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    add(vec: Vector | number) {
        if (vec instanceof Vector) {
            this.x += vec.x;
            this.y += vec.y;
        } else {
            this.x += vec;
            this.y += vec;
        }
        return this;
    }

    sub(vec: Vector | number) {
        if (vec instanceof Vector) {
            this.x -= vec.x;
            this.y -= vec.y;
        } else {
            this.x -= vec;
            this.y -= vec;
        }
        return this;
    }

    mult(scalar: number) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    div(scalar: number) {
        const inv = 1 / scalar;
        this.x *= inv;
        this.y *= inv;
        return this;
    }

    get length() {
        return Math.hypot(this.x, this.y);
    }

    normalizeVec() {
        const len = this.length;
        if (len > 0) {
            const inv = 1 / len;
            this.x *= inv;
            this.y *= inv;
        }
        return this;
    }

    dot(vec: Vector) {
        return this.x * vec.x + this.y * vec.y;
    }

    setXY(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }

    setVec(vec: Vector) {
        return this.setXY(vec.x, vec.y);
    }

    setLength(value: number) {
        return this.normalizeVec().mult(value);
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    distanceDefault(vec: Vector) {
        const dx = this.x - vec.x;
        const dy = this.y - vec.y;
        return dx * dx + dy * dy;
    }

    distance(vec: Vector) {
        const dx = this.x - vec.x;
        const dy = this.y - vec.y;
        return Math.hypot(dx, dy);
    }

    angle(vec: Vector) {
        return Math.atan2(vec.y - this.y, vec.x - this.x);
    }

    addDirection(angle: number, length: number) {
        const x = this.x + Math.cos(angle) * length;
        const y = this.y + Math.sin(angle) * length;
        return new Vector(x, y);
    }

    isEqual(vec: Vector) {
        return this.x === vec.x && this.y === vec.y;
    }

    makeString() {
        return this.x + ":" + this.y;
    }
}

export default Vector;