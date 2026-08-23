import "dotenv/config";
import { startScheduler } from "./scheduler/scheduler.js";

startScheduler();

console.log("Publishing worker started");
