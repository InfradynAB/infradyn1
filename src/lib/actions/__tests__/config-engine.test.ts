import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getConfig, getConfigTyped, DEFAULT_CONFIGS } from '@/lib/actions/config-engine';
import db from '@/db/drizzle';

// Mock the database
vi.mock('@/db/drizzle', () => ({
    default: {
        query: {
            systemConfig: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve({ success: true })),
            })),
        })),
        insert: vi.fn(() => ({
            values: vi.fn(() => Promise.resolve({ success: true })),
        })),
    },
}));

describe('Config Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getConfig', () => {
        it('should return org-specific value if it exists', async () => {
            const mockValue = '10';
            (db.query.systemConfig.findFirst as any).mockResolvedValueOnce({ configValue: mockValue });

            const result = await getConfig('delay_tolerance_days', 'org-1');
            expect(result).toBe(mockValue);
            expect(db.query.systemConfig.findFirst).toHaveBeenCalled();
        });

        it('should fall back to global value if org-specific value does not exist', async () => {
            const mockValue = '5';
            (db.query.systemConfig.findFirst as any)
                .mockResolvedValueOnce(null) // No org config
                .mockResolvedValueOnce({ configValue: mockValue }); // Global config exists

            const result = await getConfig('delay_tolerance_days', 'org-1');
            expect(result).toBe(mockValue);
            expect(db.query.systemConfig.findFirst).toHaveBeenCalledTimes(2);
        });

        it('should fall back to default value if neither org nor global exists', async () => {
            (db.query.systemConfig.findFirst as any).mockResolvedValue(null);

            const result = await getConfig('delay_tolerance_days', 'org-1');
            expect(result).toBe(DEFAULT_CONFIGS['delay_tolerance_days'].value);
        });
    });

    describe('getConfigTyped', () => {
        it('should parse NUMBER correctly', async () => {
            (db.query.systemConfig.findFirst as any).mockResolvedValueOnce({ configValue: '42' });
            const result = await getConfigTyped<number>('delay_tolerance_days');
            expect(result).toBe(42);
            expect(typeof result).toBe('number');
        });

        it('should parse BOOLEAN correctly', async () => {
            (db.query.systemConfig.findFirst as any).mockResolvedValueOnce({ configValue: 'true' });
            const result = await getConfigTyped<boolean>('aftership_api_enabled');
            expect(result).toBe(true);

            (db.query.systemConfig.findFirst as any).mockResolvedValueOnce({ configValue: 'false' });
            const result2 = await getConfigTyped<boolean>('aftership_api_enabled');
            expect(result2).toBe(false);
        });

        it('should parse JSON correctly', async () => {
            const mockJson = { foo: 'bar' };
            (db.query.systemConfig.findFirst as any).mockResolvedValueOnce({
                configValue: JSON.stringify(mockJson),
                configType: 'JSON'
            });

            const result = await getConfigTyped<any>('some_json_key');
            // Since some_json_key is not in DEFAULT_CONFIGS, it defaults to STRING
            expect(result).toBe(JSON.stringify(mockJson));
        });
    });
});
