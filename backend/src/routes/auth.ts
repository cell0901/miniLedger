import { Router } from "express";
import { authScehma, verifyOtpSchema } from "../types.ts";
import { prisma } from "../lib/prisma.ts"
import jwt from "jsonwebtoken"

export const authRouter = Router()

const userOtps = new Map<string, number>();

authRouter.post('/send-otp', (req, res) => {
  const { data, success } = authScehma.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      message: "wrong inputs"
    })
  }
  console.log("sent otp hit after zod validation")

  // generate a random 100000 - 999999 otp
  const otp = Math.floor(100000 + Math.random() * 900000);

  userOtps.set(data.number, otp);
  console.log(otp)
  res.status(200).json({
    message: "OTP sent"
  })
})

authRouter.post('/verify-otp', async (req, res) => {
  const { data, success } = verifyOtpSchema.safeParse(req.body)

  if (!success) {
    return res.status(400).json({
      message: "wrong inputs"
    })
  }
  console.log("verifyt otp hit after zod validation")

  const found = userOtps.get(data.number);

  if (!found || found !== data.otp) {
    return res.status(401).json({
      message: "wrong mobile number"
    })
  };

  try {
    // find or create the user
    const user = await prisma.user.upsert({
      where: {
        phone: data.number
      },
      update: {},
      create: {
        phone: data.number
      }
    });

    const payload = {
      userId: user.id,
      phone: user.phone,
    };

    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET ?? "jwtsecret");
      userOtps.delete(data.number);
      return res.status(200).json({
        token: token
      });
    } catch (error) {
      console.error('Error signing token:', error);
      return res.status(500).json({
        message: 'error while verifying'
      })
    }
  } catch (e) {
    console.log("error while querying database")
    res.status(500).json({
      message: "Error while querying database"
    })

  }
})

