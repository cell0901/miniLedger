import z from "zod"

export const authScehma = z.object({
  number: z.string().min(1)
});

export const verifyOtpSchema = z.object({
  number: z.string().min(1),
  otp: z.number().min(100000).max(999999)
})

export const addLoanSchema = z.object({
  friendName: z.string().trim().min(1),
  amount: z.coerce.number().positive(), // Multipart form fields arrive as strings.
  dueDate: z.coerce.date(), // converts if date is sent in string over JSON schema body
})
