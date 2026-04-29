/*
  Warnings:

  - You are about to drop the column `image` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "image";

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
