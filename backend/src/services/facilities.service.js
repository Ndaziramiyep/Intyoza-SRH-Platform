import { prisma } from '../lib/db.js';

export async function getFacilities({ 
  district, 
  province, 
  sector, 
  cell, 
  serviceName,
  isYouthFriendly,
  isIsange
} = {}) {
  const where = { showInApp: true };

  if (district) where.district = { equals: district, mode: 'insensitive' };
  if (province) where.province = { equals: province, mode: 'insensitive' };
  if (sector) where.sector = { equals: sector, mode: 'insensitive' };
  if (cell) where.cell = { equals: cell, mode: 'insensitive' };
  
  if (isYouthFriendly) where.isYouthFriendly = isYouthFriendly;
  if (isIsange) where.isIsange = isIsange;

  if (serviceName) {
    where.services = {
      some: {
        serviceName: { equals: serviceName, mode: 'insensitive' }
      }
    };
  }

  return prisma.facility.findMany({
    where,
    include: { services: true },
    orderBy: { name: 'asc' },
  });
}

// Admin: Update a single facility
export async function updateFacility(id, data) {
  return prisma.facility.update({
    where: { id },
    data,
    include: { services: true },
  });
}

// Admin: Bulk Import the 625 list
export async function importFacilities(facilitiesData) {
  // We use a transaction to ensure all or nothing is saved
  return prisma.$transaction(
    facilitiesData.map((f) => {
      return prisma.facility.create({
        data: {
          name: f.name,
          facilityType: f.facilityType,
          ownership: f.ownership || 'UNKNOWN',
          province: f.province,
          district: f.district,
          sector: f.sector,
          cell: f.cell,
          address: f.address,
          latitude: Number(f.latitude),
          longitude: Number(f.longitude),
          phone: f.phone,
          openingHours: f.openingHours,
          isYouthFriendly: f.isYouthFriendly || 'UNKNOWN',
          isIsange: f.isIsange || 'UNKNOWN',
          showInApp: f.showInApp !== false,
          verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : null,
          services: {
            create: (f.services || []).map((s) => ({
              serviceName: s.serviceName,
              status: s.status || 'UNKNOWN',
              costType: s.costType || 'UNKNOWN',
            })),
          },
        },
      });
    })
  );
}