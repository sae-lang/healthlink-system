import type { Request, Response } from "express";

export class HealthController {
  ping(_req: Request, res: Response) {
    res.json({
      status: "ok",
      service: "healthlink-backend",
      timestamp: new Date().toISOString(),
    });
  }
}
