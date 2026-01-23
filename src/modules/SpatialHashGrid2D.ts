export default class SpatialHashGrid2D {
    private readonly cellSize: number = 0;
    private readonly grid = new Map<number, Set<number>>();
    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    _getKey(x: number, y: number) {
        return (x << 16) | y;
    }

    clear() {
        this.grid.clear();
    }

    insert(x: number, y: number, radius: number, objectId: number) {
        const startX = ((x - radius) / this.cellSize) | 0;
        const startY = ((y - radius) / this.cellSize) | 0;
        const endX = ((x + radius) / this.cellSize) | 0;
        const endY = ((y + radius) / this.cellSize) | 0;

        for (let i = startX; i <= endX; i++) {
            for (let j = startY; j <= endY; j++) {
                const key = this._getKey(i, j);
                if (!this.grid.has(key)) {
                    this.grid.set(key, new Set());
                }
                this.grid.get(key)!.add(objectId);
            }
        }
    }

    query(x: number, y: number, search = 1, callback: (id: number) => boolean | void): boolean {
        const cellX = (x / this.cellSize) | 0;
        const cellY = (y / this.cellSize) | 0;
        const candidates = new Set<number>();

        let callbackSuccess = false;
        outerLoop:
        for (let i = -search; i <= search; i++) {
            for (let j = -search; j <= search; j++) {
                const key = this._getKey(cellX + i, cellY + j);
                if (this.grid.has(key)) {
                    for (const objectId of this.grid.get(key)!) {
                        if (!candidates.has(objectId)) {
                            candidates.add(objectId);
                            if (callback(objectId)) {
                                callbackSuccess = true;
                                break outerLoop;
                            }
                        }
                    }
                }
            }
        }
        return callbackSuccess;
    }

    queryFull(x: number, y: number, search = 1): number[] {
        const cellX = (x / this.cellSize) | 0;
        const cellY = (y / this.cellSize) | 0;
        const candidates = new Set<number>();

        for (let i = -search; i <= search; i++) {
            for (let j = -search; j <= search; j++) {
                const key = this._getKey(cellX + i, cellY + j);
                if (this.grid.has(key)) {
                    for (const objectId of this.grid.get(key)!) {
                        candidates.add(objectId);
                    }
                }
            }
        }
        return Array.from(candidates);
    }

    remove(x: number, y: number, radius: number, objectId: number) {
        const startX = ((x - radius) / this.cellSize) | 0;
        const startY = ((y - radius) / this.cellSize) | 0;
        const endX = ((x + radius) / this.cellSize) | 0;
        const endY = ((y + radius) / this.cellSize) | 0;

        for (let i = startX; i <= endX; i++) {
            for (let j = startY; j <= endY; j++) {
                const key = this._getKey(i, j);
                if (this.grid.has(key)) {
                    const cell = this.grid.get(key)!;
                    cell.delete(objectId);
                    if (cell.size === 0) {
                        this.grid.delete(key);
                    }
                }
            }
        }
    }
}