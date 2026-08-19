import prisma from "../db.server";

const VIEWED_STEPS = new Set(["landed", "viewed"]);

export async function recordFunnelEvent({
  shop,
  qrHandle,
  step,
  clientId,
  eventId,
  href,
}) {
  if (!shop || !qrHandle || !step || !clientId || !eventId) {
    return null;
  }

  try {
    return await prisma.qrFunnelEvent.create({
      data: {
        shop,
        qrHandle,
        step,
        clientId,
        eventId,
        href: href || null,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return null;
    }
    throw error;
  }
}

export async function getFunnelStatsByHandle(shop) {
  const rows = await prisma.qrFunnelEvent.findMany({
    where: { shop },
    select: {
      qrHandle: true,
      step: true,
      clientId: true,
    },
  });

  const sets = new Map();
  for (const row of rows) {
    if (!sets.has(row.qrHandle)) {
      sets.set(row.qrHandle, {
        viewed: new Set(),
        addedToCart: new Set(),
        purchased: new Set(),
      });
    }

    const stats = sets.get(row.qrHandle);
    if (VIEWED_STEPS.has(row.step)) {
      stats.viewed.add(row.clientId);
    }
    if (row.step === "added_to_cart") {
      stats.addedToCart.add(row.clientId);
    }
    if (row.step === "purchased") {
      stats.purchased.add(row.clientId);
    }
  }

  const result = {};
  for (const [handle, stats] of sets.entries()) {
    result[handle] = {
      viewed: stats.viewed.size,
      addedToCart: stats.addedToCart.size,
      purchased: stats.purchased.size,
    };
  }
  return result;
}
