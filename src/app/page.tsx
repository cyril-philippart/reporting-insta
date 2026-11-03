import { Dashboard } from "@/components/dashboard";
import { Suspense } from "react";
export default function Home() { return <Suspense fallback={<main className="min-h-screen bg-[#f4f6f8]"/>}><Dashboard/></Suspense>; }
