import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createUserSchema } from "@/validation/user";
import { prisma } from "@/lib/prisma";

// CREATE user
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ZOD validation
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { name, email, password, role } = result.data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
      },
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 },
    );
  }
}

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { message: "Error fetching users" },
      { status: 500 },
    );
  }
}
