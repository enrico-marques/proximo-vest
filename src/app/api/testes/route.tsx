// app/api/exam-board/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

export const GET = defineRoute({ role: "Admin" }, async () => {
    const board = {
        teste: "ok"
    }
    return NextResponse.json(board);
});