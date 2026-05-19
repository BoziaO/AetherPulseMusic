/**
 * DB: Inicjalizacja klienta Prisma.
 * Umożliwia dostęp do bazy danych SQLite w całym backendzie.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;