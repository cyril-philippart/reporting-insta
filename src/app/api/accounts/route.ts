import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import {
  deleteAccount,
  listAccounts,
  saveAccount,
  updateAccountEmail,
} from "@/lib/accounts/store";
import { verifyInstagramToken } from "@/lib/instagram/client";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json(listAccounts());
}
export async function POST(request: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const { token, email } = await request.json();
    const value = String(token ?? "").trim();
    const clientEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    if (!emailPattern.test(clientEmail))
      return NextResponse.json(
        { error: "Adresse e-mail invalide." },
        { status: 400 },
      );
    const account = await verifyInstagramToken(value);
    saveAccount({
      instagramUserId: account.id,
      username: account.username,
      token: value,
      clientEmail,
    });
    return NextResponse.json({
      id: account.id,
      username: account.username,
      clientEmail,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token invalide." },
      { status: 400 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id, email } = await request.json();
  const clientEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!emailPattern.test(clientEmail))
    return NextResponse.json(
      { error: "Adresse e-mail invalide." },
      { status: 400 },
    );
  updateAccountEmail(String(id), clientEmail);
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await request.json();
  deleteAccount(String(id));
  return NextResponse.json({ ok: true });
}
