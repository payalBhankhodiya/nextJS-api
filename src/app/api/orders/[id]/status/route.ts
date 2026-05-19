import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN"]);

    const { id } = await params;

    const body = await req.json();

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 },
      );
    }

    const [tracking, updatedOrder] = await prisma.$transaction([
      prisma.orderTracking.create({
        data: {
          orderId: id,
          status: body.status,
          message: body.message,
          location: body.location,
        },
      }),

      prisma.order.update({
        where: {
          id,
        },

        data: {
          status: body.status,
        },
      }),
    ]);

    
    return NextResponse.json({
      message: "Order status updated successfully",
      order: updatedOrder,
      tracking,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "Error updating order status" },
      { status: 500 },
    );
  }
}