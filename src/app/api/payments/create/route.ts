import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID required" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { message: "Order has no items" },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      mode: "payment",

      line_items: order.items.map((item) => ({
        price_data: {
          currency: "inr",

          product_data: {
            name: item.product.title,
          },

          unit_amount: Math.round(item.price * 100),
        },

        quantity: item.quantity,
      })),

      metadata: {
        orderId: order.id,
        userId: order.userId,
      },

      client_reference_id: order.id,

      success_url: `${baseUrl}/payment/success`,

      cancel_url: `${baseUrl}/payment/cancel`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
    });
  } catch (err: any) {
    console.error("Payment Error:", err);

    return NextResponse.json(
      { message: "Payment creation failed" },
      { status: 500 }
    );
  }
}





