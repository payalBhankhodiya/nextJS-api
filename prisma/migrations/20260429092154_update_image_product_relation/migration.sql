-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_productId_fkey";

-- AlterTable
ALTER TABLE "images" ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
