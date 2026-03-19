import Config from "../constants/Config";
import Vector from "../modules/Vector";
import { type IAngle } from "../types/Common";

export const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1);
}

export const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.hypot(x1 - x2, y1 - y2);
}

export const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
}

export const fixTo = (value: number, fraction: number) => {
    return parseFloat(value.toFixed(fraction))
}

const PI = Math.PI;
const PI2 = PI * 2;
export const getAngleDist = (a: number, b: number) => {
    // const p = Math.abs(b - a);
    // return p > PI ? PI2 - p : p;
    const p = Math.abs(b - a) % (PI * 2);
    return (p > PI ? (PI * 2) - p : p);
}

export const findMiddleAngle = (a: number, b: number) => {
    const x = Math.cos(a) + Math.cos(b);
    const y = Math.sin(a) + Math.sin(b);
    return Math.atan2(y, x);
}

export const toRadians = (degrees: number) => {
    return degrees * (PI / 180);
}

export const removeFast = (array: unknown[], index: number) => {
    if (index < 0 || index >= array.length) throw new RangeError("removeFast: Index out of range");
    
    if (index === array.length - 1) {
        array.pop();
    } else {
        array[index] = array.pop();
    }
}

export const map = (value: number, start1: number, stop1: number, start2: number, stop2: number) => {
    return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
}

export const lerp = (start: number, end: number, factor: number) => {
    return (1 - factor) * start + factor * end;
}

export const lerpAngle = (a1: number, a2: number, t: number) => {
    const diff = (a2 - a1) % PI2;
    return a1 + (((2 * diff) % PI2) - diff) * t;
}

export const reverseAngle = (angle: number) => {
    return Math.atan2(-Math.sin(angle), -Math.cos(angle));
}

export const getTargetValue = (target: any, prop: string) => {
    return target[prop];
}

export const setTargetValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
}

export const formatDate = (date?: Date) => {
    if (date == null) {
        date = new Date();
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

const incrementor = () => {
    let value = 0;
    return function() {
        return value++;
    }
}

export const getUniqueID = incrementor();

const EPS = 1e-9;
export const pointInsideRect = (
    p: Vector,
    rs: Vector,
    re: Vector
): boolean => {
    return (
        p.x >= rs.x - EPS &&
        p.x <= re.x + EPS &&
        p.y >= rs.y - EPS &&
        p.y <= re.y + EPS
    )
}

// export const circleInsideSquare = (
//     x1: number, y1: number, r1: number,
//     x2: number, y2: number, r2: number
// ) => {
//     return (
//         x1 + r1 >= x2 &&
//         x1 - r1 <= x2 + r2 &&
//         y1 + r1 >= y2 &&
//         y1 - r1 <= y2 + r2
//     )
// }

export const lineIntersectsLine = (
    p: Vector,
    p2: Vector,
    q: Vector,
    q2: Vector
): boolean => {
    const r = p2.copy().sub(p);
    const s = q2.copy().sub(q);

    const rxs = r.x * s.y - r.y * s.x;
    const q_p = q.copy().sub(p);
    const qpxr = q_p.x * r.y - q_p.y * r.x;

    if (Math.abs(rxs) < EPS) {
        if (Math.abs(qpxr) < EPS) {
            const t0 = (q_p.x * r.x + q_p.y * r.y) / (r.x * r.x + r.y * r.y);
            const t1 = t0 + (s.x * r.x + s.y * r.y) / (r.x * r.x + r.y * r.y);
            return Math.max(0, Math.min(t0, t1)) <= Math.min(1, Math.max(t0, t1));
        }
        return false;
    }

    const t = (q_p.x * s.y - q_p.y * s.x) / rxs;
    const u = (q_p.x * r.y - q_p.y * r.x) / rxs;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export const lineIntersectsRect = (
    lineStart: Vector,
    lineEnd: Vector,
    rectStart: Vector,
    rectEnd: Vector
): boolean => {
    return (
        pointInsideRect(lineStart, rectStart, rectEnd) ||
        pointInsideRect(lineEnd, rectStart, rectEnd) ||
        lineIntersectsLine(lineStart, lineEnd, rectStart, new Vector(rectEnd.x, rectStart.y)) ||
        lineIntersectsLine(lineStart, lineEnd, new Vector(rectEnd.x, rectStart.y), rectEnd) ||
        lineIntersectsLine(lineStart, lineEnd, rectEnd, new Vector(rectStart.x, rectEnd.y)) ||
        lineIntersectsLine(lineStart, lineEnd, new Vector(rectStart.x, rectEnd.y), rectStart)
    )
}

export const sleep = (ms: number): Promise<void> => {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if active DOM element is an input
 */
export const isActiveInput = () => {
    const active = document.activeElement || document.body;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
}

export const getAngleFromBitmask = (bitmask: number, rotate: boolean): number | null => {
    const vec = { x: 0, y: 0 };
    if (bitmask & 0b0001) vec.y--;
    if (bitmask & 0b0010) vec.y++;
    if (bitmask & 0b0100) vec.x--;
    if (bitmask & 0b1000) vec.x++;
    if (rotate) {
        vec.x *= -1;
        vec.y *= -1;
    }
    return vec.x === 0 && vec.y === 0 ? null : Math.atan2(vec.y, vec.x);
}

export const formatCode = (code: string): string => {
    code = code + "";
    if (code === "Backspace") return code;
    if (code === "Escape") return "ESC";
    if (code === "Delete") return "DEL";
    if (code === "Minus") return "-";
    if (code === "Equal") return "=";
    if (code === "BracketLeft") return "[";
    if (code === "BracketRight") return "]";
    if (code === "Slash") return "/";
    if (code === "Backslash") return "\\";
    if (code === "Quote") return "'";
    if (code === "Backquote") return "`";
    if (code === "Semicolon") return ";";
    if (code === "Comma") return ",";
    if (code === "Period") return ".";
    if (code === "CapsLock") return "CAPS";
    if (code === "ContextMenu") return "CTXMENU";
    if (code === "NumLock") return "LOCK";
    return code.replace(/^Page/, "PG")
               .replace(/^Digit/, "")
               .replace(/Button$/, "BTN")
               .replace(/^Key/, "")
               .replace(/^(Shift|Control|Alt)(L|R).*$/, "$2$1")
               .replace(/Control/, "CTRL")
               .replace(/^Arrow/, "")
               .replace(/^Numpad/, "NUM")
               .replace(/Decimal/, "DEC")
               .replace(/Subtract/, "SUB")
               .replace(/Divide/, "DIV")
               .replace(/Multiply/, "MULT").toUpperCase();
}

export const formatButton = (button: number) => {
    if (button === 0) return "LBTN"; // Left Button
    if (button === 1) return "MBTN"; // Middle Button
    if (button === 2) return "RBTN"; // Right Button
    if (button === 3) return "BBTN"; // Back Button
    if (button === 4) return "FBTN"; // Forward Button
    throw new Error(`formatButton Error: "${button}" is not valid button`);
}

export const removeClass = (target: HTMLElement | NodeListOf<HTMLElement>, name: string) => {
    if (target instanceof HTMLElement) {
        target.classList.remove(name);
        return;
    }

    for (const element of target) {
        element.classList.remove(name);
    }
}

export const pointInWinter = (position: Vector) => {
    const y = position.y;
    return y <= Config.snowBiomeTop;
}

export const pointInRiver = (position: Vector) => {
    const y = position.y;
    const below = y >= (Config.mapScale / 2 - Config.riverWidth / 2);
    const above = y <= (Config.mapScale / 2 + Config.riverWidth / 2);
    return below && above;
}

export const pointInDesert = (position: Vector) => {
    return position.y >= (Config.mapScale - Config.snowBiomeTop);
}

export const inRange = (value: number, min: number, max: number) => {
    return value >= min && value <= max;
}

export const targetInsideRect = (target: Vector, rectPos: Vector, radius: number) => {
    const screen = new Vector(1920, 1080).div(2).add(radius);
    const rectStart = rectPos.copy().sub(screen);
    const rectEnd = rectPos.copy().add(screen);
    return pointInsideRect(target, rectStart, rectEnd);
}


export const findPlacementAngles = (angles: IAngle[]) => {
    const output = new Set<number>();

    for (let i = 0; i < angles.length; i++) {
        const [ angle, offset ] = angles[i]!;
        const start = angle - offset;
        const end = angle + offset;

        let startIntersects = false;
        let endIntersects = false;

        for (let j = 0; j < angles.length; j++) {
            if (startIntersects && endIntersects) break;

            if (i === j) continue;

            const [ angle, offset ] = angles[j]!;
            if (getAngleDist(start, angle) <= offset) startIntersects = true;
            if (getAngleDist(end, angle) <= offset) endIntersects = true;
        }
  
        if (!startIntersects) output.add(start);
        if (!endIntersects) output.add(end);
    }
  
    return [...output];
}

// export const getAngleOffset = (a: Vector, b: Vector, scale: number): IAngle => {
//     const distance = a.distance(b);
//     const angle = a.angle(b);
//     const offset = Math.asin((2 * scale) / (2 * distance));
//     return [ angle, offset ];
// }

export const createAction = (callback: () => void, time = 0) => {
    let state = false;

    const timeoutID = setTimeout(() => {
        if (state) return;
        state = true;
        callback();
    }, time);

    return () => {
        if (state) return;
        state = true;
        clearTimeout(timeoutID);
        callback();
    }
}