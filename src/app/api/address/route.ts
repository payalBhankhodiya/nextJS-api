import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { createAddressSchema } from "@/validation/address";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireRoles(req, ["USER", "ADMIN"]);

    const body = await req.json();

    const result = createAddressSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const data = result.data;

    const address = await prisma.address.create({
      data: {
        userId: currentUser.userId,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        isDefault: data.isDefault ?? false,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error creating address" },
      { status: 500 },
    );
  }
}
