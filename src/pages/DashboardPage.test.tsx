import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '../context/AuthContext';
import { productApi } from '../api/productApi';

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockGetProducts = vi.mocked(productApi.getProducts);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderDashboardPage = () => {
    return render(
        <MemoryRouter>
            <DashboardPage />
        </MemoryRouter>
    );
};

describe('DashboardPage', () => {
    let defaultMockAuth: any;

    beforeEach(() => {
        defaultMockAuth = {
            user: { username: 'testAdmin', role: 'admin' },
            logout: vi.fn(),
        };
        mockUseAuth.mockReturnValue(defaultMockAuth);
        mockNavigate.mockClear();
        mockGetProducts.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('前端元素', () => {
        it('渲染儀表板基本元素', async () => {
            mockGetProducts.mockResolvedValue([]);
            renderDashboardPage();

            expect(screen.getByRole('heading', { level: 1, name: '儀表板' })).toBeInTheDocument();
            expect(screen.getByText('T')).toBeInTheDocument(); // testAdmin's first letter
            expect(screen.getByText('Welcome, testAdmin 👋')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 3, name: '商品列表' })).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
        });

        it('僅 admin 角色可見管理後台連結', async () => {
            // Test admin
            mockGetProducts.mockResolvedValue([]);
            const { unmount } = renderDashboardPage();
            expect(screen.getByRole('link', { name: '🛠️ 管理後台' })).toBeInTheDocument();
            unmount();

            // Test user
            mockUseAuth.mockReturnValue({
                ...defaultMockAuth,
                user: { username: 'testUser', role: 'user' },
            });
            renderDashboardPage();
            expect(screen.queryByRole('link', { name: '🛠️ 管理後台' })).not.toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
        });
    });

    describe('function 邏輯', () => {
        it('登出功能正常運作', async () => {
            mockGetProducts.mockResolvedValue([]);
            renderDashboardPage();

            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);

            expect(defaultMockAuth.logout).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
        });
    });

    describe('Mock API', () => {
        it('顯示商品載入中狀態', () => {
            // Keep promise pending
            mockGetProducts.mockReturnValue(new Promise(() => { }));
            renderDashboardPage();

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
            expect(screen.getByText('商品列表')).toBeInTheDocument();
        });

        it('成功取得商品列表並正確渲染', async () => {
            mockGetProducts.mockResolvedValue([
                { id: '1', name: 'MacBook Pro', description: 'Laptop', price: 60000, category: 'Electronics', stock: 10, imageUrl: '' },
                { id: '2', name: 'iPhone', description: 'Phone', price: 30000, category: 'Electronics', stock: 20, imageUrl: '' }
            ]);
            renderDashboardPage();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
            expect(screen.getByText('NT$ 60,000')).toBeInTheDocument();
            expect(screen.getByText('iPhone')).toBeInTheDocument();
            expect(screen.getByText('NT$ 30,000')).toBeInTheDocument();
        });

        it('API 發生一般錯誤時顯示錯誤訊息', async () => {
            const error: any = new Error('Bad Request');
            error.response = { status: 400, data: { message: '無法載入商品資料' } };
            mockGetProducts.mockRejectedValue(error);

            renderDashboardPage();

            await waitFor(() => {
                expect(screen.getByText('⚠️')).toBeInTheDocument();
                expect(screen.getByText('無法載入商品資料')).toBeInTheDocument();
            });
        });

        it('API 發生 401 錯誤時由 interceptor 處理', async () => {
            const error: any = new Error('Unauthorized');
            error.response = { status: 401 };
            mockGetProducts.mockRejectedValue(error);

            renderDashboardPage();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            // Should not show general error message
            expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
        });
    });
});
