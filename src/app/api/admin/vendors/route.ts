import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createVendor,
  createVendorSchema,
  listVendors,
  listPurchaseOrders,
  createPurchaseOrder,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatus,
  getProjectVendorMargin,
} from "@/lib/vendors";

export async function GET(request: Request) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  if (searchParams.get("view") === "purchase_orders") {
    return NextResponse.json({ purchaseOrders: await listPurchaseOrders({ projectId }) });
  }
  if (projectId && searchParams.get("view") === "margin") {
    return NextResponse.json({ margin: await getProjectVendorMargin(projectId) });
  }
  return NextResponse.json({ vendors: await listVendors() });
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const body = await request.json();
  if (body.type === "purchase_order") {
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const po = await createPurchaseOrder(parsed.data);
    return NextResponse.json({ purchaseOrder: po }, { status: 201 });
  }
  const parsed = createVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const vendor = await createVendor(parsed.data);
  return NextResponse.json({ vendor }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;
  const body = await request.json();
  if (body.purchaseOrderId && body.status) {
    await updatePurchaseOrderStatus(String(body.purchaseOrderId), body.status);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}
