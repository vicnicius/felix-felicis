import { Handlebars } from "./deps.ts";


type TemplateOpts = Record<string, unknown>

// @TODO: Add parser for template options types. Number -> uint, string -> principal, etc.
export const build = async (templatePath: string, templateOpts: TemplateOpts, outputPath?: string): Promise<string | undefined> => {
    try {
        const handlebars = new Handlebars();
        const builtContract = await handlebars.render(templatePath, templateOpts);
        if (outputPath !== undefined) {
            const encoder = new TextEncoder();
            const data = encoder.encode(builtContract);
            await Deno.writeFile(outputPath, data);
        }
        return builtContract;
    } catch(error) {
        console.error(error);
    }
}