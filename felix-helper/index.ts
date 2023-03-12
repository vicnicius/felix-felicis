import { loadConfig } from "./deps.ts";
import { run } from "./main.ts";

await loadConfig({
    allowEmptyValues: true,
    export: true
});

run();