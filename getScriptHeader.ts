import type { PackageJson } from "type-fest";

const getBundleHash = async (): Promise<string> => {
    try {
        const response = await fetch("https://moomoo.io/");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const match = text.match(/assets\/(.+?\.js)/);

        if (match && match[1]) return match[1];
        return "Not Found";
    } catch (error) {
        console.error("Error fetching or parsing bundle hash:", error);
        return "Error";
    }
}

const formatStart = (digit: number) => {
    return (digit + "").padStart(2, "0");
}

const getFormattedDate = () => {
    const now = new Date();

    const day = formatStart(now.getDate());
    const month = formatStart(now.getMonth() + 1);
    const year = formatStart(now.getFullYear());

    const hours = formatStart(now.getHours());
    const minutes = formatStart(now.getMinutes());
    const seconds = formatStart(now.getSeconds());

    return `${day}/${month}/${year} | ${hours}:${minutes}:${seconds}`;
}

const getScriptHeader = async (file: string) => {
    const bundleHash = await getBundleHash();
    const packageJSON: PackageJson = await Bun.file("package.json").json();
    const userscriptHeader = await Bun.file(file).text();
    const header = userscriptHeader
                    .replace(/{ADDITIONAL_INFO}/, `Version: {SCRIPT_VERSION}\n    Build Time: ${getFormattedDate()}\n    Works On: ${bundleHash}`)
                    .replace(/{SCRIPT_VERSION}/g, packageJSON.version!)
    
    return { header: header, version: packageJSON.version! };
}

export default getScriptHeader;