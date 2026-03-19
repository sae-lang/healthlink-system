import { app } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./database/migrations.js";
import { logger } from "./utils/logger.js";

runMigrations();

app.listen(env.PORT, "0.0.0.0", () => {
  logger.info({ port: env.PORT }, "HealthLink backend is running");
});
