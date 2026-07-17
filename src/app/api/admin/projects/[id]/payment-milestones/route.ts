import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listProjectPaymentMilestones,
  replaceProjectPaymentMilestones,
} from "@/lib/project-payment-milestones";

type Props = { params: Promise<{ id: string }> };

const itemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amount: z.number().int().min(0),
  status: z.enum(["pending", "due", "paid", "overdue"]),
  dueDate: z.string().optional().nullable(),
});

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { id } = await params;
  return NextResponse.json({ milestones: await listProjectPaymentMilestones(id) });
}

export async function PUT(request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ items: z.array(itemSchema).min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Échéances invalides." }, { status: 400 });
  }
  const milestones = await replaceProjectPaymentMilestones(id, parsed.data.items);
  return NextResponse.json({ milestones });
}
