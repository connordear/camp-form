import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { inArray } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./schema";

// Check if we're in dev mode
if (process.env.IS_DEV !== "true") {
  console.error(
    "❌ Error: Seed users can only run in development mode (IS_DEV=true)",
  );
  process.exit(1);
}

const FIRST_NAMES = [
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Oliver",
  "Isabella",
  "Elijah",
  "Sophia",
  "Lucas",
  "Mia",
  "Mason",
  "Charlotte",
  "Ethan",
  "Amelia",
  "Logan",
  "Harper",
  "James",
  "Evelyn",
  "Alexander",
  "Abigail",
  "Benjamin",
  "Emily",
  "Jacob",
  "Elizabeth",
  "Michael",
  "Mila",
  "Daniel",
  "Ella",
  "Henry",
  "Avery",
  "Jackson",
  "Sofia",
  "Sebastian",
  "Camila",
  "Aiden",
  "Aria",
  "Matthew",
  "Scarlett",
  "Samuel",
  "Victoria",
  "David",
  "Madison",
  "Joseph",
  "Luna",
  "Carter",
  "Grace",
  "Owen",
  "Chloe",
  "Wyatt",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
];

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SWIMMING_LEVELS = ["beginner", "intermediate", "advanced", "expert"];
const GENDERS = ["male", "female", "other"];
const RELATIONSHIPS = ["parent", "guardian", "relative", "caregiver", "other"];
const OTC_MEDS = [
  "Acetaminophen (Tylenol)",
  "Ibuprofen (Advil)",
  "Antacids (Tums, Rolaids)",
  "Antihistamines (Benadryl)",
  "Antibiotic Cream",
  "Sting Relief/Cream",
  "Insect Repellent",
  "Sunscreen",
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): { firstName: string; lastName: string } {
  return {
    firstName: randomItem(FIRST_NAMES),
    lastName: randomItem(LAST_NAMES),
  };
}

async function seed() {
  console.log("🌱 Starting User/Registration Seeding...");
  console.log("🧹 Clearing existing user data...");

  // Clear existing data (in reverse dependency order)
  await db.delete(schema.medicalInfo);
  await db.delete(schema.camperEmergencyContacts);
  await db.delete(schema.registrationDetails);
  await db.delete(schema.registrations);
  await db.delete(schema.campers);
  await db.delete(schema.emergencyContacts);
  await db.delete(schema.addresses);
  await db.delete(schema.user);

  console.log("✅ Cleared existing data");

  console.log("👤 Creating test accounts...");

  const testAccounts = [
    {
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
      name: "Admin User",
    },
    {
      email: "hcp@test.com",
      password: "hcp123",
      role: "hcp",
      name: "Healthcare Provider",
    },
    {
      email: "staff@test.com",
      password: "staff123",
      role: "staff",
      name: "Staff Member",
    },
    {
      email: "user@test.com",
      password: "user123",
      role: "user",
      name: "Regular User",
    },
  ];

  for (const account of testAccounts) {
    const hashedPassword = await hashPassword(account.password);

    const [user] = await db
      .insert(schema.user)
      .values({
        name: account.name,
        email: account.email,
        emailVerified: true,
        role: account.role as "admin" | "hcp" | "staff" | "user",
      })
      .returning({ id: schema.user.id, email: schema.user.email });

    await db.insert(schema.account).values({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    });

    console.log(`   ✅ Created ${account.role}: ${account.email}`);
  }

  console.log("✅ Test accounts created");

  const allCamps = await db.select().from(schema.camps);

  const campYears = await db
    .select()
    .from(schema.campYears)
    .where(inArray(schema.campYears.year, [2024, 2025, 2026]));

  const allPrices = await db.select().from(schema.campYearPrices);

  const campDataByYear = {
    2024: allCamps
      .map((camp) => {
        const yearData = campYears.find(
          (y) => y.campId === camp.id && y.year === 2024,
        );
        if (!yearData) return null;

        const prices = allPrices.filter(
          (p) => p.campId === camp.id && p.year === 2024,
        );

        return {
          id: camp.id,
          name: camp.name,
          description: camp.description,
          yearData: { ...yearData, prices },
        };
      })
      .filter((camp): camp is NonNullable<typeof camp> => camp !== null),
    2025: allCamps
      .map((camp) => {
        const yearData = campYears.find(
          (y) => y.campId === camp.id && y.year === 2025,
        );
        if (!yearData) return null;

        const prices = allPrices.filter(
          (p) => p.campId === camp.id && p.year === 2025,
        );

        return {
          id: camp.id,
          name: camp.name,
          description: camp.description,
          yearData: { ...yearData, prices },
        };
      })
      .filter((camp): camp is NonNullable<typeof camp> => camp !== null),
    2026: allCamps
      .map((camp) => {
        const yearData = campYears.find(
          (y) => y.campId === camp.id && y.year === 2026,
        );
        if (!yearData) return null;

        const prices = allPrices.filter(
          (p) => p.campId === camp.id && p.year === 2026,
        );

        return {
          id: camp.id,
          name: camp.name,
          description: camp.description,
          yearData: { ...yearData, prices },
        };
      })
      .filter((camp): camp is NonNullable<typeof camp> => camp !== null),
  };

  console.log(
    `🏕 Found ${campDataByYear[2024].length} camps for 2024, ${campDataByYear[2025].length} for 2025, ${campDataByYear[2026].length} for 2026`,
  );

  // Create seed users (parents) - about 30-50 unique users
  const numUsers = randomInt(35, 45);
  console.log(`👥 Creating ${numUsers} parent users...`);

  const createdUsers: { id: string; email: string }[] = [];
  const createdAddresses: { id: string; userId: string }[] = [];
  const createdEmergencyContacts: { id: string; userId: string }[] = [];

  // Create users
  for (let i = 0; i < numUsers; i++) {
    const { firstName, lastName } = generateName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    const [user] = await db
      .insert(schema.user)
      .values({
        name: `${firstName} ${lastName}`,
        email,
        emailVerified: true,
        role: "user",
      })
      .returning({ id: schema.user.id, email: schema.user.email });

    createdUsers.push(user);

    // Create address for user
    const [address] = await db
      .insert(schema.addresses)
      .values({
        userId: user.id,
        addressLine1: faker.location.streetAddress(),
        addressLine2:
          Math.random() > 0.7 ? faker.location.secondaryAddress() : null,
        city: faker.location.city(),
        stateProv: faker.location.state(),
        country: "Canada",
        postalZip: faker.location.zipCode("A#A #A#"),
        isDefault: true,
      })
      .returning({ id: schema.addresses.id, userId: schema.addresses.userId });

    createdAddresses.push(address);

    // Create 1-2 emergency contacts per user
    const numContacts = randomInt(1, 2);
    for (let j = 0; j < numContacts; j++) {
      const { firstName: contactFirst, lastName: contactLast } = generateName();
      const relationship = randomItem(RELATIONSHIPS);

      const [contact] = await db
        .insert(schema.emergencyContacts)
        .values({
          userId: user.id,
          name: `${contactFirst} ${contactLast}`,
          phone: faker.phone.number({ style: "international" }),
          email: faker.internet.email({
            firstName: contactFirst,
            lastName: contactLast,
          }),
          relationship,
          relationshipOther: relationship === "other" ? "Family Friend" : null,
        })
        .returning({
          id: schema.emergencyContacts.id,
          userId: schema.emergencyContacts.userId,
        });

      createdEmergencyContacts.push(contact);
    }
  }

  console.log(
    `✅ Created ${createdUsers.length} users, ${createdAddresses.length} addresses, ${createdEmergencyContacts.length} emergency contacts`,
  );

  // Now create registrations for each camp across all years
  let totalRegistrations = 0;
  let totalCampers = 0;
  const allYears = [2024, 2025, 2026] as const;

  for (const year of allYears) {
    const campsForYear = campDataByYear[year];
    console.log(`\n📅 Processing ${year} season...`);

    for (const camp of campsForYear) {
      const prices = camp.yearData!.prices;
      if (prices.length === 0) {
        console.log(`⚠️ Skipping ${camp.name} ${year} - no prices found`);
        continue;
      }

      const numRegistrations = randomInt(8, 15);
      console.log(
        `   🏕 Creating ${numRegistrations} registrations for ${camp.name} ${year}...`,
      );

      // Determine age range based on camp type
      let minAge: number, maxAge: number;
      switch (camp.name) {
        case "LIT Camp":
          minAge = 13;
          maxAge = 17;
          break;
        case "Kids Camp":
        case "4 Night Kids Camp":
        case "2-Night Mini Camp":
          minAge = 7;
          maxAge = 12;
          break;
        case "Youth Camp":
          minAge = 12;
          maxAge = 16;
          break;
        case "Family Camp":
          minAge = 1;
          maxAge = 65;
          break;
        case "MADD Camp":
          minAge = 8;
          maxAge = 15;
          break;
        default:
          minAge = 7;
          maxAge = 16;
      }

      for (let i = 0; i < numRegistrations; i++) {
        const user = randomItem(createdUsers);
        const address = createdAddresses.find((a) => a.userId === user.id)!;
        const userEmergencyContacts = createdEmergencyContacts.filter(
          (ec) => ec.userId === user.id,
        );

        let numCampers = randomInt(1, 2);
        if (camp.name === "Family Camp" && Math.random() > 0.8) {
          numCampers = 3;
        }

        // For past years (2024, 2025), mostly completed registrations
        // For current year (2026), mix of draft/registered/refunded
        let status: "draft" | "registered" | "refunded";
        if (year === 2024 || year === 2025) {
          const rand = Math.random();
          if (rand < 0.85) {
            status = "registered";
          } else {
            status = "refunded";
          }
        } else {
          const rand = Math.random();
          if (rand < 0.4) {
            status = "draft";
          } else if (rand < 0.85) {
            status = "registered";
          } else {
            status = "refunded";
          }
        }

        const price = randomItem(prices);
        const startDate = new Date(camp.yearData!.startDate);
        const endDate = new Date(camp.yearData!.endDate);
        const numDays = price.isDayPrice
          ? randomInt(
              1,
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : null;
        const basePrice = numDays ? price.price * numDays : price.price;
        const pricePaid =
          status === "draft" ? 0 : status === "refunded" ? 0 : basePrice;

        const camperIds: string[] = [];
        for (let j = 0; j < numCampers; j++) {
          const { firstName, lastName } = generateName();
          const dateOfBirth = faker.date.birthdate({
            min: minAge,
            max: maxAge,
            mode: "age",
          });

          const [camper] = await db
            .insert(schema.campers)
            .values({
              userId: user.id,
              addressId: address.id,
              firstName,
              lastName,
              dateOfBirth: dateOfBirth.toISOString().split("T")[0],
              swimmingLevel: randomItem(SWIMMING_LEVELS),
              gender: randomItem(GENDERS),
              hasBeenToCamp: Math.random() > 0.6,
              shirtSize: randomItem(SHIRT_SIZES),
              arePhotosAllowed: Math.random() > 0.1,
              dietaryRestrictions:
                Math.random() > 0.7 ? faker.lorem.sentence() : null,
            })
            .returning({ id: schema.campers.id });

          camperIds.push(camper.id);
          totalCampers++;

          const hasAllergies = Math.random() > 0.8;
          const hasMedicationsAtCamp = Math.random() > 0.85;
          const hasMedicationsNotAtCamp = Math.random() > 0.9;
          const hasMedicalConditions = Math.random() > 0.85;

          await db.insert(schema.medicalInfo).values({
            camperId: camper.id,
            healthCareNumber: faker.string.numeric(9),
            familyDoctor: `${generateName().firstName} ${generateName().lastName}`,
            doctorPhone: faker.phone.number({ style: "international" }),
            height: `${randomInt(100, 180)} cm`,
            weight: `${randomInt(25, 80)} kg`,
            hasAllergies,
            allergiesDetails: hasAllergies ? faker.lorem.sentence() : null,
            usesEpiPen: hasAllergies && Math.random() > 0.5,
            hasMedicationsAtCamp,
            medicationsAtCampDetails: hasMedicationsAtCamp
              ? faker.lorem.sentence()
              : null,
            hasMedicationsNotAtCamp,
            medicationsNotAtCampDetails: hasMedicationsNotAtCamp
              ? faker.lorem.sentence()
              : null,
            otcPermissions: faker.helpers.arrayElements(OTC_MEDS, {
              min: 0,
              max: 5,
            }),
            hasMedicalConditions,
            medicalConditionsDetails: hasMedicalConditions
              ? faker.lorem.sentence()
              : null,
            additionalInfo: Math.random() > 0.8 ? faker.lorem.sentence() : null,
          });

          const numLinks = Math.min(
            userEmergencyContacts.length,
            randomInt(1, 2),
          );
          const shuffled = [...userEmergencyContacts].sort(
            () => 0.5 - Math.random(),
          );
          for (let k = 0; k < numLinks; k++) {
            await db.insert(schema.camperEmergencyContacts).values({
              camperId: camper.id,
              emergencyContactId: shuffled[k].id,
              priority: k + 1,
            });
          }
        }

        for (const camperId of camperIds) {
          const [registration] = await db
            .insert(schema.registrations)
            .values({
              campId: camp.id,
              campYear: year,
              priceId: price.id,
              camperId,
              numDays,
              pricePaid,
              status,
              stripePaymentIntentId:
                status !== "draft"
                  ? `pi_${faker.string.alphanumeric(24)}`
                  : null,
              stripeSessionId:
                status !== "draft"
                  ? `cs_${faker.string.alphanumeric(48)}`
                  : null,
            })
            .returning({ id: schema.registrations.id });

          await db.insert(schema.registrationDetails).values({
            registrationId: registration.id,
            cabinRequest:
              Math.random() > 0.7
                ? `Cabin ${randomItem(["A", "B", "C", "D"])}`
                : null,
            parentSignature:
              status !== "draft"
                ? `${generateName().firstName} ${generateName().lastName}`
                : null,
            additionalInfo:
              Math.random() > 0.8 ? faker.lorem.paragraph() : null,
          });

          totalRegistrations++;
        }
      }

      console.log(
        `      ✅ Created ${numRegistrations} registrations for ${camp.name} ${year}`,
      );
    }
  }

  console.log("\n✨ Seeding Complete!");
  console.log(`📊 Summary:`);
  console.log(`   - ${createdUsers.length} users created`);
  console.log(`   - ${totalCampers} campers created`);
  console.log(`   - ${totalRegistrations} registrations created`);
  console.log(`   - Across ${allYears.length} years (2024-2026)`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
