import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { updateCategorySchema } from "@/validation/category";
import { requireRoles } from "@/lib/require-role";

// GET by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN", "USER"]);

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}

// UPDATE
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN"]);

    const { id } = await params;
    const body = await req.json();

    const result = updateCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const { name } = result.data;

    const exists = await prisma.category.findUnique({
      where: { name },
    });

    if (exists && exists.id !== id) {
      return NextResponse.json(
        { message: "Category already exists" },
        { status: 409 },
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  try {

    await requireRoles(req, ["ADMIN"]);

    const body = await req.json();
    const ids: string[] = body.ids;

    // validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    // limit size
    if (ids.length > 10) {
      return NextResponse.json({ message: "Too many items" }, { status: 400 });
    }

    const result = await prisma.category.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      message: "Deleted successfully",
      count: result.count,
    });
  }catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
