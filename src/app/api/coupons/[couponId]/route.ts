// app/api/admin/coupons/[couponId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CouponType, CouponTarget } from "@/generated/prisma";
import { defineRoute } from "@/server/auth/define-route";


export const PUT = defineRoute<{ couponId: string }>({ perm: "coupon.manage" }, async (req, { params }) => {
  const { couponId } =  await params;

  const body = await req.json();

  const {
    code,
    type,
    discountValue,
    validFor,
    redeemLimit,
    expiresAt,
  } = body as {
    code?: string;
    type?: CouponType | string;
    discountValue?: number;
    validFor?: CouponTarget | string;
    redeemLimit?: number | null;
    expiresAt?: string | null;
  };

  const coupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      code: code ? code.trim().toUpperCase() : undefined,
      type: type as CouponType | undefined,
      discountValue,
      validFor: validFor as CouponTarget | undefined,
      redeemLimit,
      expiresAt: expiresAt
        ? new Date(expiresAt)
        : expiresAt === null
          ? null
          : undefined,
    },
  });

  return NextResponse.json(coupon);
});

export const DELETE = defineRoute<{ couponId: string }>({ perm: "coupon.manage" }, async (_req, { params }) => {
  const { couponId } = await params;

  await prisma.coupon.delete({
    where: { id: couponId },
  });

  return NextResponse.json({ ok: true });
});
