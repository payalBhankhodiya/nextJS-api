import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createCategorySchema } from "@/validation/category";
import { requireRoles } from "@/lib/require-role";

// CREATE category
export async function POST(req: NextRequest) {
  try {
    await requireRoles(req, ["ADMIN"]);

    const body = await req.json();

    const result = createCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { name } = result.data;

    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Category already exists" },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error creating category" },
      { status: 500 },
    );
  }
}

// GET all categories
export async function GET(req: NextRequest) {
  try {
    await requireRoles(req, ["ADMIN", "USER"]);

    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const formatted = categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error fetching categories" },
      { status: 500 },
    );
  }
}
