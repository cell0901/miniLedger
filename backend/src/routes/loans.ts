import { Router } from "express";
import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { authMiddleware } from "./main.ts";
import { addLoanSchema } from "../types.ts";
import { prisma } from "../lib/prisma.ts"
import { receiptUpload, receiptExtension, uploadsDirectory } from "../lib/receipts.ts";

export const loanRouter = Router()

// Accept the existing JSON requests, or form-data with an optional receipt.
loanRouter.post("/", authMiddleware, receiptUpload.single("receipt"), async (req, res) => {
  const { data, success } = addLoanSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      message: "wrong inputs sent"
    })
  };

  let receiptPath: string | null = null;
  if (req.file) {
    // checks to check if user uploaded valid jpeg or image format. return early if error
    const extension = receiptExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ message: "Choose a JPEG, PNG or WebP image." });
    }
    receiptPath = "receipts/" + randomUUID() + extension;
  }

  try {
    if (req.file && receiptPath) {
      await mkdir(path.join(uploadsDirectory, "receipts"), { recursive: true });
      await writeFile(path.join(uploadsDirectory, receiptPath), req.file.buffer); // put the file in /uploads folder
    }
    await prisma.loan.create({
      data: {
        userId: req.userId,
        friendName: data.friendName,
        amount: data.amount,
        dueDate: data.dueDate,
        receiptPath
      }
    });
    res.status(200).json({
      message: "Added Loan"
    });
  } catch (e) {
    // Do not leave a photo behind if saving the loan failed.
    if (receiptPath) await unlink(path.join(uploadsDirectory, receiptPath)).catch(() => { }); // unlink used to delete a file 
    res.status(500).json({
      message: "error while adding new loan"
    })
  }
})

// optional Route to see receipt
loanRouter.get('/:loanId/receipt', authMiddleware, async (req, res) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: String(req.params.loanId), userId: req.userId }
    });
    if (!loan?.receiptPath) {
      return res.status(404).json({ message: "No receipt found" });
    }
    // Only the owner can open this file. There is no public uploads URL.
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(loan.receiptPath, { root: uploadsDirectory }, (error) => {
      if (error && !res.headersSent) res.status(404).json({ message: "Receipt file not found" });
    });
  } catch {
    res.status(500).json({ message: "Error while opening receipt" });
  }
});

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

// Return readable JSON for oversized files and unexpected upload fields.
const uploadErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (!(error instanceof multer.MulterError)) {
    if (!req.is('multipart/form-data')) return next(error);
    console.error('Receipt upload failed:', error);
    return res.status(400).json({ message: "Receipt upload was incomplete. Reattach the photo and try again." });
  }
  const tooLarge = error.code === "LIMIT_FILE_SIZE";
  res.status(tooLarge ? 413 : 400).json({
    message: tooLarge ? "Receipt must be 5 MB or smaller." : "Attach one receipt image only."
  });
};
loanRouter.use(uploadErrorHandler);
