import { NextFunction, Request, Response, Router } from "express";
import { authRouter } from "./auth";
import { loanRouter } from "./loans";
import jwt, { JwtPayload } from "jsonwebtoken"

declare global {
  namespace Express {
    interface Request {
      userId: string,
      phone: string
    }
  }
}
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"]
  if (!authHeader) {
    return res.status(401).json({ message: "no auth token sent" })
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "jwtsecret") as JwtPayload;
    req.phone = decoded.phone;
    req.userId = decoded.userId;
    next()
  } catch (e) {
    console.log(e);
    return res.status(401).json({ message: "error while verifying jwt" })
  }
}

export const mainRouter = Router()

mainRouter.use('/auth', authRouter)
mainRouter.use('/loans', loanRouter)
