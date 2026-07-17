import type { Vendor, VendorPurchaseOrder } from "@/lib/vendors";
import type { PurchaseOrderStatus } from "@/content/priority3-labels";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/admin/vendors", { credentials: "include" });
  const json = await parseFetchJson<{ vendors: Vendor[] }>(res);
  return json.vendors;
}

export async function createVendorApi(input: Record<string, unknown>): Promise<Vendor> {
  const res = await fetch("/api/admin/vendors", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ vendor: Vendor }>(res);
  return json.vendor;
}

export async function updateVendorApi(id: string, input: Record<string, unknown>): Promise<Vendor> {
  const res = await fetch("/api/admin/vendors", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorId: id, ...input }),
  });
  const json = await parseFetchJson<{ vendor: Vendor }>(res);
  return json.vendor;
}

export async function deleteVendorApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/vendors?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson(res);
}

export async function fetchPurchaseOrders(projectId?: string): Promise<VendorPurchaseOrder[]> {
  const params = new URLSearchParams({ view: "purchase_orders" });
  if (projectId) params.set("projectId", projectId);
  const res = await fetch(`/api/admin/vendors?${params}`, { credentials: "include" });
  const json = await parseFetchJson<{ purchaseOrders: VendorPurchaseOrder[] }>(res);
  return json.purchaseOrders;
}

export async function createPurchaseOrderApi(
  input: Record<string, unknown>,
): Promise<VendorPurchaseOrder> {
  const res = await fetch("/api/admin/vendors", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "purchase_order", ...input }),
  });
  const json = await parseFetchJson<{ purchaseOrder: VendorPurchaseOrder }>(res);
  return json.purchaseOrder;
}

export async function updatePurchaseOrderStatusApi(
  id: string,
  status: PurchaseOrderStatus,
): Promise<void> {
  const res = await fetch("/api/admin/vendors", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purchaseOrderId: id, status }),
  });
  await parseFetchJson(res);
}

export async function fetchProjectVendorMargin(projectId: string): Promise<{
  budget: number | null;
  vendorCosts: number;
  margin: number | null;
}> {
  const params = new URLSearchParams({ view: "margin", projectId });
  const res = await fetch(`/api/admin/vendors?${params}`, { credentials: "include" });
  const json = await parseFetchJson<{
    margin: { budget: number | null; vendorCosts: number; margin: number | null };
  }>(res);
  return json.margin;
}
