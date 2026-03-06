import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminPage } from './AdminPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderAdminPage = () => {
    return render(
        <MemoryRouter>
            <AdminPage />
        </MemoryRouter>
    );
};

describe('AdminPage', () => {
    let defaultMockAuth: any;

    beforeEach(() => {
        defaultMockAuth = {
            user: { username: 'testAdmin', role: 'admin' },
            logout: vi.fn(),
        };
        mockUseAuth.mockReturnValue(defaultMockAuth);
        mockNavigate.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('前端元素', () => {
        it('渲染管理後台基本元素', () => {
            renderAdminPage();

            expect(screen.getByRole('link', { name: '← 返回' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 1, name: '🛠️ 管理後台' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.getByText('只有 admin 角色可以訪問')).toBeInTheDocument();
            expect(screen.getByText('user 角色會被重定向')).toBeInTheDocument();
            expect(screen.getByText('受路由守衛保護')).toBeInTheDocument();
        });

        it('根據 admin 角色顯示標籤', () => {
            renderAdminPage();
            expect(screen.getByText('管理員')).toBeInTheDocument();
            expect(screen.queryByText('一般用戶')).not.toBeInTheDocument();
        });

        it('根據 user 角色顯示標籤', () => {
            mockUseAuth.mockReturnValue({
                ...defaultMockAuth,
                user: { username: 'testUser', role: 'user' },
            });
            renderAdminPage();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
            expect(screen.queryByText('管理員')).not.toBeInTheDocument();
        });
    });

    describe('function 邏輯', () => {
        it('點擊返回導向', () => {
            renderAdminPage();
            const backLink = screen.getByRole('link', { name: '← 返回' });
            expect(backLink).toHaveAttribute('href', '/dashboard');
        });

        it('登出功能正常運作', () => {
            renderAdminPage();
            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);

            expect(defaultMockAuth.logout).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
