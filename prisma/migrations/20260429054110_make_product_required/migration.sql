/*
  Warnings:

  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_productId_fkey";

-- DropTable
DROP TABLE "Image";

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_productId_idx" ON "images"("productId");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
