const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateTimeEntriesToSessions() {
    console.log('Starting migration from TimeEntry to WorkSession...');

    try {
        // Get all users
        const users = await prisma.user.findMany();

        for (const user of users) {
            console.log(`\nMigrating data for user: ${user.email}`);

            // Get all time entries for this user, ordered by time
            const entries = await prisma.timeEntry.findMany({
                where: { userId: user.id },
                orderBy: { time: 'asc' }
            });

            console.log(`  Found ${entries.length} time entries`);

            let sessionCount = 0;
            let i = 0;

            while (i < entries.length) {
                const entry = entries[i];

                if (entry.type === 'START') {
                    // Look for matching STOP
                    const stopEntry = entries[i + 1];

                    if (stopEntry && stopEntry.type === 'STOP') {
                        // Valid session pair
                        const startTime = new Date(entry.time);
                        const endTime = new Date(stopEntry.time);
                        const totalDuration = (endTime - startTime) / (1000 * 60 * 60); // hours

                        await prisma.workSession.create({
                            data: {
                                userId: user.id,
                                startTime,
                                endTime,
                                status: 'COMPLETED',
                                totalDuration,
                                breakDuration: 0,
                                netDuration: totalDuration,
                                note: entry.note || stopEntry.note || null,
                            }
                        });

                        sessionCount++;
                        i += 2; // Skip both START and STOP
                    } else {
                        // Orphaned START - create ongoing session or completed with same start/end
                        console.log(`  Warning: Orphaned START entry at ${entry.time}`);

                        await prisma.workSession.create({
                            data: {
                                userId: user.id,
                                startTime: new Date(entry.time),
                                endTime: new Date(entry.time), // Same as start
                                status: 'COMPLETED',
                                totalDuration: 0,
                                breakDuration: 0,
                                netDuration: 0,
                                note: entry.note,
                            }
                        });

                        sessionCount++;
                        i++;
                    }
                } else {
                    // Orphaned STOP
                    console.log(`  Warning: Orphaned STOP entry at ${entry.time}`);

                    await prisma.workSession.create({
                        data: {
                            userId: user.id,
                            startTime: new Date(entry.time),
                            endTime: new Date(entry.time),
                            status: 'COMPLETED',
                            totalDuration: 0,
                            breakDuration: 0,
                            netDuration: 0,
                            note: entry.note,
                        }
                    });

                    sessionCount++;
                    i++;
                }
            }

            console.log(`  Created ${sessionCount} work sessions`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\nNote: Old TimeEntry data has been preserved in _legacy_time_entries table');
        console.log('You can safely delete it after verifying the migration.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateTimeEntriesToSessions()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
