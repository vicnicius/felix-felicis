import { Handlebars } from "./deps.ts";


type TemplateOpts = Record<string, unknown>

export const build = async (templatePath: string, output: string, templateOpts: TemplateOpts): void => {
    try {
        const handlebars = new Handlebars();
        const builtContract = await handlebars.render(templatePath, templateOpts);
        const encoder = new TextEncoder();
        const data = encoder.encode(builtContract);
        await Deno.writeFile(output, data);
    } catch(error) {
        console.error(error);
    }
}