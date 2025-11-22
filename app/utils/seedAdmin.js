const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@hb-medien.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Default Company
    const company = await prisma.company.create({
        data: {
            name: 'HB Medien',
            address: 'Musterstraße 1, 12345 Musterstadt',
            country: 'de-DE', // Default locale
        },
    });

    console.log('Created company:', company.name);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            companyId: company.id,
            role: 'ADMIN'
        },
        create: {
            email,
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            companyId: company.id,
            weeklyHoursTarget: 40.0
        },
    });

    console.log('Created admin user:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
