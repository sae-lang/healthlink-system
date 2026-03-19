export const logger = {
  info(payload: unknown, message?: string) {
    console.log(JSON.stringify({ level: "info", message, ...((payload as object) ?? {}) }));
  },
  error(payload: unknown, message?: string) {
    console.error(JSON.stringify({ level: "error", message, ...((payload as object) ?? {}) }));
  },
};
