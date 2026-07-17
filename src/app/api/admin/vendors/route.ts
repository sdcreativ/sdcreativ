import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createVendor,
  createVendorSchema,
  updateVendor,
  updateVendorSchema,
  deleteVendor,
  listVendors,
  listPurchaseOrders,
  createPurchaseOrder,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatus,
  getProjectVendorMargin,
} from "@/lib/vendors";
import { PO_STATUSES } from "@/content/priority3-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.vendors.read();
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
  const authError = await crmApiAuth.vendors.write();
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
  const authError = await crmApiAuth.vendors.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const body = await request.json();
  if (body.purchaseOrderId && body.status) {
    if (!PO_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    await updatePurchaseOrderStatus(String(body.purchaseOrderId), body.status);
    return NextResponse.json({ ok: true });
  }
  if (body.vendorId) {
    const parsed = updateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const vendor = await updateVendor(String(body.vendorId), parsed.data);
    if (!vendor) return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
    return NextResponse.json({ vendor });
  }
  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const authError = await crmApiAuth.vendors.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await deleteVendor(id);
  if (!ok) return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
