import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  const hashedTestPassword = await bcrypt.hash('test123456', 10);

  // Create Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const halter1 = await prisma.user.upsert({
    where: { email: 'halter@test.de' },
    update: {},
    create: {
      email: 'halter@test.de',
      name: 'Max Mustermann',
      password: hashedTestPassword,
      role: 'HALTER',
    },
  });

  const halter2 = await prisma.user.upsert({
    where: { email: 'halter2@test.de' },
    update: {},
    create: {
      email: 'halter2@test.de',
      name: 'Anna Schmidt',
      password: hashedTestPassword,
      role: 'HALTER',
    },
  });

  const fahrer1 = await prisma.user.upsert({
    where: { email: 'fahrer@test.de' },
    update: {},
    create: {
      email: 'fahrer@test.de',
      name: 'Lisa Müller',
      password: hashedTestPassword,
      role: 'FAHRER',
    },
  });

  const fahrer2 = await prisma.user.upsert({
    where: { email: 'fahrer2@test.de' },
    update: {},
    create: {
      email: 'fahrer2@test.de',
      name: 'Tom Weber',
      password: hashedTestPassword,
      role: 'FAHRER',
    },
  });

  console.log('Users created');

  // Create Fahrzeuge
  const fahrzeug1 = await prisma.fahrzeug.upsert({
    where: { id: 'fahrzeug-1' },
    update: {},
    create: {
      id: 'fahrzeug-1',
      name: 'VW Golf 8',
      kilometerstand: 25000,
      kilometerpauschale: 0.35,
      halterId: halter1.id,
      schluesselablageort: 'Schlüsselkasten im Eingang',
      status: 'VERFUEGBAR',
    },
  });

  const fahrzeug2 = await prisma.fahrzeug.upsert({
    where: { id: 'fahrzeug-2' },
    update: {},
    create: {
      id: 'fahrzeug-2',
      name: 'BMW 3er',
      kilometerstand: 15000,
      kilometerpauschale: 0.45,
      halterId: halter1.id,
      schluesselablageort: 'Tiefgarage, Parkplatz 12',
      status: 'VERFUEGBAR',
    },
  });

  const fahrzeug3 = await prisma.fahrzeug.upsert({
    where: { id: 'fahrzeug-3' },
    update: {},
    create: {
      id: 'fahrzeug-3',
      name: 'Audi A4',
      kilometerstand: 50000,
      kilometerpauschale: 0.40,
      halterId: halter2.id,
      schluesselablageort: 'Büro Rezeption',
      status: 'VERFUEGBAR',
    },
  });

  const fahrzeug4 = await prisma.fahrzeug.upsert({
    where: { id: 'fahrzeug-4' },
    update: {},
    create: {
      id: 'fahrzeug-4',
      name: 'Mercedes Sprinter',
      kilometerstand: 80000,
      kilometerpauschale: 0.55,
      halterId: halter2.id,
      schluesselablageort: 'Werkstatt Schlüsselbrett',
      status: 'IN_WARTUNG',
    },
  });

  console.log('Fahrzeuge created');

  // Create Buchungen
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.buchung.create({
    data: {
      fahrzeugId: fahrzeug1.id,
      userId: fahrer1.id,
      startZeit: tomorrow,
      endZeit: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000), // +4 hours
      status: 'GEPLANT',
      buchungsart: 'NORMALFAHRT',
    },
  });

  await prisma.buchung.create({
    data: {
      fahrzeugId: fahrzeug2.id,
      userId: fahrer2.id,
      startZeit: nextWeek,
      endZeit: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000), // +2 hours
      status: 'GEPLANT',
      buchungsart: 'NORMALFAHRT',
    },
  });

  const completedBuchung = await prisma.buchung.create({
    data: {
      fahrzeugId: fahrzeug1.id,
      userId: fahrer1.id,
      startZeit: yesterday,
      endZeit: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000),
      status: 'ABGESCHLOSSEN',
      buchungsart: 'NORMALFAHRT',
    },
  });

  console.log('Buchungen created');

  // Create a sample Fahrt
  await prisma.fahrt.create({
    data: {
      buchungId: completedBuchung.id,
      fahrzeugId: fahrzeug1.id,
      fahrerId: fahrer1.id,
      startKilometer: 24900,
      endKilometer: 25000,
      gefahreneKm: 100,
      kosten: 35.0, // 100 km * 0.35 €/km
      kilometerKonflikt: false,
      konfliktGeloest: true,
    },
  });

  console.log('Fahrten created');

  // Create a sample Zahlung
  await prisma.zahlung.create({
    data: {
      fahrerId: fahrer1.id,
      fahrzeugId: fahrzeug1.id,
      betrag: 35.0,
      bestaetigung_fahrer: true,
      bestaetigung_halter: false,
      status: 'AUSSTEHEND',
      beschreibung: 'Zahlung für Fahrt vom ' + yesterday.toLocaleDateString('de-DE'),
    },
  });

  console.log('Zahlungen created');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
