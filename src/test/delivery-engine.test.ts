import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmDelivery } from '@/lib/actions/delivery-engine';
import db from '@/db/drizzle';
import { getVarianceThresholds } from '@/lib/actions/config-engine';

// Mock the database
vi.mock('@/db/drizzle', () => ({
    default: {
        query: {
            shipment: {
                findFirst: vi.fn(),
            },
            deliveryReceipt: {
                findFirst: vi.fn(),
            },
            qaInspectionTask: {
                findFirst: vi.fn(),
            },
            deliveryItem: {
                findMany: vi.fn(),
            },
            boqItem: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
            },
            milestone: {
                findMany: vi.fn(),
            }
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve({ success: true })),
            })),
        })),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
            })),
        })),
    },
}));

// Mock config-engine
vi.mock('@/lib/actions/config-engine', () => ({
    getVarianceThresholds: vi.fn(),
    getDelayThresholds: vi.fn(),
    getConfigTyped: vi.fn(),
    getConfig: vi.fn(),
}));

const mockedGetVarianceThresholds = vi.mocked(getVarianceThresholds);

describe('Delivery Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('confirmDelivery', () => {
        it('should successfully confirm delivery and create related records', async () => {
            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                id: 'ship-1',
                purchaseOrderId: 'po-1',
                purchaseOrder: { projectId: 'proj-1', organizationId: 'org-1' },
            });

            mockedGetVarianceThresholds.mockResolvedValueOnce({
                variancePercent: 5,
                highVariancePercent: 10,
            } as any);

            // Mock other internal queries
            (db.query.deliveryItem.findMany as any).mockResolvedValue([]);
            (db.query.deliveryReceipt.findFirst as any).mockResolvedValue({
                id: 'receipt-1',
                variancePercent: '0',
                shipment: { purchaseOrderId: 'po-1', purchaseOrder: { projectId: 'proj-1', organizationId: 'org-1' } }
            });
            (db.query.boqItem.findMany as any).mockResolvedValue([]);
            (db.query.milestone.findMany as any).mockResolvedValue([]);

            const input = {
                shipmentId: 'ship-1',
                receivedBy: 'user-1',
                items: [
                    {
                        boqItemId: 'boq-1',
                        quantityDelivered: 100,
                        quantityDeclared: 100,
                        condition: 'GOOD' as const,
                    },
                ],
            };

            const result = await confirmDelivery(input);
            expect(result.success).toBe(true);
            expect(db.insert).toHaveBeenCalled();
        });

        it('should detect quantity variance and create a conflict', async () => {
            (db.query.shipment.findFirst as any).mockResolvedValueOnce({
                id: 'ship-1',
                purchaseOrderId: 'po-1',
                purchaseOrder: { projectId: 'proj-1', organizationId: 'org-1' },
            });

            mockedGetVarianceThresholds.mockResolvedValueOnce({
                variancePercent: 5,
                highVariancePercent: 10,
            } as any);

            // Mock receipt to have variance
            (db.query.deliveryReceipt.findFirst as any).mockResolvedValue({
                id: 'receipt-1',
                variancePercent: '15', // 15% variance
                shipment: { purchaseOrderId: 'po-1', purchaseOrder: { projectId: 'proj-1', organizationId: 'org-1' } }
            });
            (db.query.deliveryItem.findMany as any).mockResolvedValue([]);
            (db.query.boqItem.findMany as any).mockResolvedValue([]);
            (db.query.milestone.findMany as any).mockResolvedValue([]);

            const input = {
                shipmentId: 'ship-1',
                receivedBy: 'user-1',
                items: [
                    {
                        boqItemId: 'boq-1',
                        quantityDelivered: 85,
                        quantityDeclared: 100,
                        condition: 'GOOD' as const,
                    },
                ],
            };

            const result = await confirmDelivery(input);
            expect(result.success).toBe(true);
            expect(db.insert).toHaveBeenCalled();
        });
    });
});
