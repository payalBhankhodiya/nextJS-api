import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createProductSchema } from "@/validation/product";

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
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error creating product" },
      { status: 500 }
    );
  }
}

// GET all products
export async function GET() {
  try {
    const products = await prisma.product.findMany();

    return NextResponse.json(products);
  } catch {
    return NextResponse.json(
      { message: "Error fetching products" },
      { status: 500 }
    );
  }
}