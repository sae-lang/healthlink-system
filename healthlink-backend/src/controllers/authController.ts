import type { Request, Response } from "express";
import { AuthService } from "../services/authService.js";

const authService = new AuthService();

export class AuthController {
  register(req: Request, res: Response) {
    res.status(201).json(authService.register(req.body));
  }

  login(req: Request, res: Response) {
    res.json(authService.login(req.body));
  }
}
