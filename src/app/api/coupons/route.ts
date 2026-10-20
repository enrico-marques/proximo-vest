// app/api/admin/coupons/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CouponType, CouponTarget } from "@/generated/prisma/client";
import { defineRoute } from "@/server/auth/define-route";

export const GET = defineRoute({ perm: ["coupon.read", "coupon.manage"] }, async () => {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
});

export const POST = defineRoute({ perm: "coupon.manage" }, async (req) => {
  const body = await req.json();

  const {
    code,
    type,
    discountValue,
    validFor,
    redeemLimit,
    expiresAt,
  } = body as {
    code: string;
    type: CouponType | string;
    discountValue: number;
    validFor: CouponTarget | string;
    redeemLimit?: number | null;
    expiresAt?: string | null;
  };

  const coupon = await prisma.coupon.create({
    data: {
      code: code.trim().toUpperCase(),
      type: type as CouponType,
      discountValue,
      validFor: validFor as CouponTarget,
      redeemLimit: redeemLimit ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
});
