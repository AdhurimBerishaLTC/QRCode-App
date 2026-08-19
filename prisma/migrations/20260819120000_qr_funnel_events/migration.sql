-- CreateTable
CREATE TABLE "QrFunnelEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "qrHandle" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "href" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "QrFunnelEvent_eventId_key" ON "QrFunnelEvent"("eventId");
CREATE INDEX "QrFunnelEvent_shop_qrHandle_idx" ON "QrFunnelEvent"("shop", "qrHandle");
