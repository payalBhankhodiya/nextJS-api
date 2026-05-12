import { NextRequest, NextResponse } from "next/server";

import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "../../../../../generated/prisma/enums";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { message: "Missing stripe signature" },
        { status: 400 },
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Stripe signature verification failed:", err.message);

      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 400 },
      );
    }

    // PAYMENT SUCCESS
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;

      const userId = session.metadata?.userId;

      if (!orderId || !userId) {
        return NextResponse.json(
          {
            message: "Missing metadata",
          },
          { status: 400 },
        );
      }

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!order) {
        return NextResponse.json(
          {
            message: "Order not found",
          },
          { status: 404 },
        );
      }

      // PREVENT DUPLICATES
      const existingPayment = await prisma.payment.findFirst({
        where: { orderId },
      });

      if (existingPayment) {
        return NextResponse.json(
          {
            message: "Payment already processed",
          },
          { status: 200 },
        );
      }

      // CREATE PAYMENT
      await prisma.payment.upsert({
        where: { orderId },
        update: {},
        create: {
          orderId,
          stripeSessionId: session.id,
          amount: (session.amount_total || 0) / 100,
          status: PaymentStatus.PAID,
        },
      });

      // UPDATE ORDER STATUS
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "PAID",
        },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err.message);

    return NextResponse.json(
      {
        message: "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}
