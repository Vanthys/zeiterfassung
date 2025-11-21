const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.timeEntry.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    const user1 = await prisma.user.create({
        data: {
            username: 'Alice',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            username: 'Bob',
        },
    });

    const user3 = await prisma.user.create({
        data: {
            username: 'Charlie',
        },
    });

    console.log('Created users:', { user1, user2, user3 });

    // Create some time entries
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Alice: worked yesterday from 9am-5pm
    await prisma.timeEntry.create({
        data: {
            userId: user1.id,
            time: new Date(yesterday.setHours(9, 0, 0, 0)),
            type: 'START',
        },
    });

    await prisma.timeEntry.create({
        data: {
            userId: user1.id,
            time: new Date(yesterday.setHours(17, 0, 0, 0)),
            type: 'STOP',
        },
    });

    // Bob: worked two days ago from 10am-6pm, currently working (started at 8am today)
    await prisma.timeEntry.create({
        data: {
            userId: user2.id,
            time: new Date(twoDaysAgo.setHours(10, 0, 0, 0)),
            type: 'START',
        },
    });

    await prisma.timeEntry.create({
        data: {
            userId: user2.id,
            time: new Date(twoDaysAgo.setHours(18, 0, 0, 0)),
            type: 'STOP',
        },
    });

    await prisma.timeEntry.create({
        data: {
            userId: user2.id,
            time: new Date(now.setHours(8, 0, 0, 0)),
            type: 'START',
        },
    });

    // Charlie: no time entries yet

    console.log('Seed data created successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
