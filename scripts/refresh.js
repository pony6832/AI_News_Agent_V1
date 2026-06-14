import { refreshNews } from "../src/orchestrator.js";

const result = await refreshNews();

console.log(`Refreshed ${result.items.length} items.`);
console.log(`High priority: ${result.items.filter((item) => item.priority === "high").length}`);
console.log(`Report: ${result.reportPath}`);
