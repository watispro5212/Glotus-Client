const HatPredictor = new class HatPredictor {
    private readonly transitions = new Map<number, Map<number, number>>();
    
    train(history: number[]) {
        this.transitions.clear();
        
        for (let i = 0; i < history.length - 1; i++) {
            const currentHat = history[i]!;
            const nextHat = history[i + 1]!;
            
            if (!this.transitions.has(currentHat)) {
                this.transitions.set(currentHat, new Map());
            }
            
            const nextMap = this.transitions.get(currentHat)!;
            nextMap.set(nextHat, (nextMap.get(nextHat) || 0) + 1);
        }
    }
    
    predict(currentHat: number) {
        if (!this.transitions.has(currentHat)) {
            return null;
        }
        
        const nextMap = this.transitions.get(currentHat)!;
        let maxCount = 0;
        let predictedHat = null;
        
        for (const [hat, count] of nextMap) {
            if (count > maxCount) {
                maxCount = count;
                predictedHat = hat;
            }
        }
        
        return predictedHat;
    }
}

export default HatPredictor;