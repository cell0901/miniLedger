import z from "zod"

export const authScehma = z.object({
  number: z.string().min(1)
});

export const verifyOtpSchema = z.object({
  number: z.string().min(1),
  otp: z.number().min(100000).max(999999)
})

export const addLoanSchema = z.object({
  friendName: z.string().min(1),
  amount: z.number().positive(), // > 0
  dueDate: z.coerce.date(), // converts if date is sent in string over JSON schema body
})
