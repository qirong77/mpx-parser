

export function parseMpxScript(scriptContent: string) {
    try {

        return scriptContent;
    } catch (error) {
        console.error("Error parsing script:", error);
        return scriptContent;
    }
}
