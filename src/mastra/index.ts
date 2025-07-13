import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { weatherAgent } from "./agents/weather-agent/weather-agent"; // Optional, can delete if not needed
import { weatherWorkflow } from "./agents/weather-agent/weather-workflow"; // Optional, can delete if not needed
import { solanaAgent } from "./agents/solana-agent/solana-agent"; // Updated import for your renamed agent
import { 
  solanaPortfolioAnalysis,
  tokenResearch,
  tokenLaunchWorkflow,
  tradingWorkflow,
  weatherWorkflow as weatherWorkflowImport
} from "./workflows";

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow, 
    solanaPortfolioAnalysis,
    tokenResearch,
    tokenLaunchWorkflow,
    tradingWorkflow
  },
  agents: { weatherAgent, solanaAgent }, // Replace yourAgent with solanaAgent
  storage: new LibSQLStore({
    url: "file:./mastra.db", // Persistent storage for workflow data
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    port: 8080,
    timeout: 10000,
  },
});