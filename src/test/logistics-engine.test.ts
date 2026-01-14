import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateEtaConfidence, checkAndCreateDelayConflict } from '@/lib/actions/logistics-engine';
import db from '@/db/drizzle';
import { getDelayThresholds } from '@/lib/actions/config-engine';

// Mock the database
vi.mock('@/db/drizzle', () => ({
    default: {
        query: {
            shipment: {
                findFirst: vi.fn(),
            },
            supplierAccuracy: {
                findFirst: vi.fn(),
            },
            conflictRecord: {
                findFirst: vi.fn(),
            },
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve({ success: true })),
            })),
        })),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(() => Promise.resolve([{ id: 'new-conflict-id' }])),
            })),
        })),
    },
}));

// Mock config-engine
vi.mock('@/lib/actions/config-engine', () => ({
    getDelayThresholds: vi.fn(),
    getVarianceThresholds: vi.fn(),
    getConfigTyped: vi.fn(),
    getConfig: vi.fn(),
}));

const mockedGetDelayThresholds = vi.mocked(getDelayThresholds);

describe('Logistics Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateEtaConfidence', () => {
        it('should return HIGH if tracking is linked and logistics ETA exists', async () => {
            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                isTrackingLinked: true,
                logisticsEta: new Date(),
            });

            const result = await calculateEtaConfidence('ship-1');
            expect(result).toBe('HIGH');
        });

        it('should return MEDIUM if supplier has high accuracy', async () => {
            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                isTrackingLinked: false,
                supplierId: 'supp-1',
            });
            (db.query.supplierAccuracy.findFirst as any).mockResolvedValueOnce({
                accuracyScore: '85',
            });

            const result = await calculateEtaConfidence('ship-1');
            expect(result).toBe('MEDIUM');
        });

        it('should return LOW by default', async () => {
            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                isTrackingLinked: false,
                supplierId: 'supp-1',
            });
            (db.query.supplierAccuracy.findFirst as any).mockResolvedValueOnce(null);

            const result = await calculateEtaConfidence('ship-1');
            expect(result).toBe('LOW');
        });
    });

    describe('checkAndCreateDelayConflict', () => {
        it('should create a conflict if delay exceeds thresholds', async () => {
            const rosDate = new Date('2024-01-01');
            const supplierAos = new Date('2024-01-10'); // 9 days delay

            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                id: 'ship-1',
                rosDate,
                supplierAos,
                purchaseOrderId: 'po-1',
                purchaseOrder: { organizationId: 'org-1' },
            });

            mockedGetDelayThresholds.mockResolvedValueOnce({
                toleranceDays: 2,
                highDelayDays: 5,
            } as any);

            (db.query.conflictRecord.findFirst as any).mockResolvedValueOnce(null);

            const result = await checkAndCreateDelayConflict('ship-1');
            expect(result).toBe('new-conflict-id');
            expect(db.insert).toHaveBeenCalled();
        });

        it('should auto-resolve if no delay', async () => {
            const rosDate = new Date('2024-01-10');
            const supplierAos = new Date('2024-01-01'); // Early

            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                id: 'ship-1',
                rosDate,
                supplierAos,
                purchaseOrder: { organizationId: 'org-1' },
            });

            mockedGetDelayThresholds.mockResolvedValueOnce({
                toleranceDays: 2,
                highDelayDays: 5,
            } as any);

            await checkAndCreateDelayConflict('ship-1');
            expect(db.update).toHaveBeenCalled(); // Auto-resolve call
        });
    });
});
