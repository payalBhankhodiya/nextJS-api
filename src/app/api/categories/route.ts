import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCategorySchema } from "@/validation/category";

// CREATE category
export async function POST(req: Request) {
  try {
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

    const category = await prisma.category.create({
      data: {
        name: body.name,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error creating category" },
      { status: 500 },
    );
  }
}

// GET all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      productCount: cat._count.products,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET_CATEGORIES_ERROR:", error);

    return NextResponse.json(
      { message: "Error fetching categories" },
      { status: 500 },
    );
  }
}
