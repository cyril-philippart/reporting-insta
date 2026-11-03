import { NextResponse } from "next/server"; import { createSession, validPassword } from "@/lib/auth/session";
export async function POST(request:Request){ const {password}=await request.json(); if(!validPassword(String(password??""))) return NextResponse.json({error:"Mot de passe incorrect."},{status:401}); await createSession(); return NextResponse.json({ok:true}); }
