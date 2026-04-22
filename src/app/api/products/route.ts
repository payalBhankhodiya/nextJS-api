import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createProductSchema } from "@/validation/product";
import { NextRequest } from "next/server";

// CREATE product
export async function POST(req: Request) {
  try {
    const body = await req.json();

   
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 }
      );
    }

    const data = result.data;

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        price: data.price,
        stock: data.stock,
        image: data.image ?? null,
        categories: {
          connect: data.categoryIds?.map((id) => ({ id })) || [],
        },
      },
      include: {
        categories: true, 
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error creating product" },
      { status: 500 }
    );
  }
};



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryIds = searchParams.getAll("category");
    const minPrice = searchParams.get("min");
    const maxPrice = searchParams.get("max");

    const where: any = {};

    if (categoryIds.length) {
      where.categories = {
        some: {
          id: {
            in: categoryIds,
          },
        },
      };
    }

    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice && { gte: Number(minPrice) }),
        ...(maxPrice && { lte: Number(maxPrice) }),
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        categories: true,
      },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error fetching products" },
      { status: 500 }
    );
  }
};



