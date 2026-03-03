import { z } from "zod";

// --- Member Validation Schema ---
// Used for Academic Council, PAC, BoS, and Stakeholders
export const memberSchema = z.object({
  member_name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  member_id: z.string().optional(),
  organization: z.string().min(2, { message: "Organization is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  mobile_number: z
    .string()
    .regex(/^\d{10}$/, { message: "Phone must be exactly 10 digits." }),
  specialisation: z.string().optional(),
  category: z.string().min(1, { message: "Please select a category." }),
  stakeholder_password: z.string().optional(),
  is_approved: z.boolean().optional(),
  tenure_start_date: z.string().optional(),
  tenure_end_date: z.string().optional(),
  linkedin_id: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

// --- PEO Validation Schema ---
export const peoSchema = z.object({
  statement: z
    .string()
    .min(10, { message: "PEO statement must be at least 10 characters long." }),
});

// --- Date Range Schema ---
// Used for PEO Process Timelines
export const dateRangeSchema = z
  .object({
    startDate: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid start date.",
      }),
    endDate: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid end date.",
      }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: "End date must be after start date.",
      path: ["endDate"], // Points error to endDate field
    },
  );
