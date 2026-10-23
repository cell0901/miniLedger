import { Router } from "express";
import { authMiddleware } from "./main.ts";
import { addLoanSchema } from "../types.ts";
import { prisma } from "../lib/prisma.ts"

export const loanRouter = Router()

// i could have added a auth middleware but i will just add this logic
loanRouter.post("/", authMiddleware, async (req, res) => {
  const { data, success } = addLoanSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      message: "wrong inputs sent"
    })
  };

  try {
    await prisma.loan.create({
      data: {
        userId: req.userId,
        friendName: data.friendName,
        amount: data.amount,
        dueDate: data.dueDate
      }
    });
    res.status(200).json({
      message: "Added Loan"
    });
  } catch (e) {
    res.status(500).json({
      message: "error while adding new loan"
    })
  }
})

loanRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const response = await prisma.loan.findMany({
      where: {
        userId: req.userId
      }
    });
    res.status(200).json({
      loans: response
    })
  } catch (e) {
    res.status(500).json({
      message: "error while getting loan entries"
    })
  }
})

loanRouter.patch('/:loanId/repay', authMiddleware, async (req, res) => {

  const { loanId } = req.params as { loanId: string }
  try {
    const found = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId: req.userId
      }
    });

    if (!found) {
      return res.status(404).json({
        message: "no loan found"
      })
    };

    if (found.status == "REPAID") {
      return res.status(409).json({
        message: "loan is already repaid"
      })
    };

    const response = await prisma.loan.update({
      where: {
        id: loanId,
        userId: req.userId
      },
      data: {
        status: "REPAID",
        repaidAt: new Date()
      }
    })

    res.status(200).json({
      message: "Loan marked as repaid",
      loan: {
        id: response.id,
        status: response.status,
        repaidAt: response.repaidAt
      }
    })

  } catch (e) {
    res.status(500).json({
      message: "error while marking loan repaid"
    });
  }
})

loanRouter.get('/summary', authMiddleware, async (req, res) => {
  try {

    const totalLent = await prisma.loan.aggregate({ // including repaid and pending
      where: {
        userId: req.userId
      },
      _sum: {
        amount: true
      }
    });

    const totalRepaid = await prisma.loan.aggregate({
      where: {
        userId: req.userId,
        status: "REPAID",
      },
      _sum: {
        amount: true
      }
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const overdue = await prisma.loan.aggregate({
      where: {
        userId: req.userId,
        status: "PENDING",
        dueDate: { lt: today } // lt stands for less than.
      },
      _sum: {
        amount: true
      }
    });

    const summary = {
      totalLent: totalLent._sum.amount ?? 0,
      totalRepaid: totalRepaid._sum.amount ?? 0,
      overdue: overdue._sum.amount ?? 0
    }
    res.status(200).json({
      summary
    })

  } catch (e) {
    res.status(500).json({
      message: "error while finding summary"
    })
  }
})
