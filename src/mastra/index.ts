import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent/weather-agent"; // Optional, can delete if not needed
import { weatherWorkflow } from "./agents/weather-agent/weather-workflow"; // Optional, can delete if not needed
import { solanaAgent } from "./agents/solana-agent/solana-agent"; // Updated import for your renamed agent

export const mastra = new Mastra({
  workflows: { weatherWorkflow }, // Optional, remove if you delete weatherWorkflow
  agents: { weatherAgent, solanaAgent }, // Replace yourAgent with solanaAgent
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    port: 8080,
    timeout: 10000,
  },
});