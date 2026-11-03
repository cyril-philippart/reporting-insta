import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const COOKIE="cynes_session";
function secret(){ return process.env.CYNES_ADMIN_PASSWORD ?? ""; }
function signature(){ return createHmac("sha256",secret()).update("cynes-admin").digest("hex"); }
export async function isAuthenticated(){ const value=(await cookies()).get(COOKIE)?.value; if(!value||!secret()) return false; const expected=signature(); return value.length===expected.length && timingSafeEqual(Buffer.from(value),Buffer.from(expected)); }
export async function createSession(){ (await cookies()).set(COOKIE,signature(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*12}); }
export async function clearSession(){ (await cookies()).delete(COOKIE); }
export function validPassword(value:string){ const expected=secret(); return Boolean(expected) && value.length===expected.length && timingSafeEqual(Buffer.from(value),Buffer.from(expected)); }
