declare module "*.html" {
    const content: string;
    export default content;
}

declare module "*.css" {
    const content: string;
    export default content;
}

declare global {
    interface Window {
        Glotus: any;

        readonly config: {
            nameY: number;
            deathFadeout: number;
        }
    }
}