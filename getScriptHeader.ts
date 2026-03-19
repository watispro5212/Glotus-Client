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

const sanitize = (text: string) => {
    return text.replace(/[\s\n]/g, "").replace(/\/\/==\/?UserScript==/g, "");
}

const createHash = (input: string) => {
    let hash = 2166136261;
    const fnvPrime = 16777619;

    for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        hash ^= charCode;
        hash *= fnvPrime;
        hash = hash & 0xFFFFFFFF;
    }

    let hexString = hash.toString(16);
    while (hexString.length < 8) {
        hexString = "0" + hexString;
    }
    
    return hexString;
}

const getScriptHeader = async (file: string) => {
    const bundleHash = await getBundleHash();
    const packageJSON: PackageJson = await Bun.file("package.json").json();
    const userscriptHeader = await Bun.file(file).text();
    
    let header = userscriptHeader
                    .replace(/{BUILD_TIME}/g, getFormattedDate())
                    .replace(/{WORKS_ON}/g, bundleHash)
                    .replace(/{SCRIPT_VERSION}/g, packageJSON.version!);

    const headerData = header.match(/\/\/\s*==UserScript==\s*(.+?)\s*\/\/\s*==\/UserScript==/s);
    let header_hash = "";
    if (headerData !== null) {
        const data = headerData[1];
        if (data) {
            const sanitized = sanitize(data);
            header_hash = createHash(sanitized);
        }
    }

    header = header.replace(/{HEADER_HASH}/g, header_hash);
    console.log("Generated hash:", header_hash);
    return {
        header,
        version: packageJSON.version!,
        header_hash,
    }
}

export default getScriptHeader;