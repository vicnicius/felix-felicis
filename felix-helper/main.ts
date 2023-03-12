import { build } from "./template.ts";

export const run = (): void => {
    const contractTemplatePath = Deno.env.get('TEMPLATE_PATH');
    if (contractTemplatePath === undefined) {
        throw new Error('The TEMPLATE_PATH environment variable is not set.')
    }
    build(contractTemplatePath, './test.clar', {
        fee: 'u3',
        ticketPrice: 'u10000',
        numberOfTickets: 'u1000',
        slotSize: 'u100000',
        numberOfSlots: 'u0'
    });
}