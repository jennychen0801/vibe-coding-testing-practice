import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

const renderLoginPage = () => {
    return render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('LoginPage', () => {
    let defaultMockAuth: any;

    beforeEach(() => {
        defaultMockAuth = {
            login: vi.fn(),
            isAuthenticated: false,
            authExpiredMessage: null,
            clearAuthExpiredMessage: vi.fn(),
            user: null,
            token: null,
            isLoading: false,
            logout: vi.fn(),
            checkAuth: vi.fn(),
        };
        mockUseAuth.mockReturnValue(defaultMockAuth);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('前端元素', () => {
        it('渲染登入頁面基本元素', () => {
            renderLoginPage();

            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 1, name: '歡迎回來' })).toBeInTheDocument();
        });

        it('環境變數未設定時顯示測試提示', () => {
            // Backup
            const originalEnv = import.meta.env.VITE_API_URL;
            // @ts-ignore
            import.meta.env.VITE_API_URL = '';

            renderLoginPage();
            expect(screen.getByText('測試帳號：任意 email 格式 / 密碼需包含英數且8位以上')).toBeInTheDocument();

            // Restore
            // @ts-ignore
            import.meta.env.VITE_API_URL = originalEnv;
        });
    });

    describe('function 邏輯', () => {
        it('Email 格式驗證失敗', async () => {
            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(defaultMockAuth.login).not.toHaveBeenCalled();
        });

        it('密碼長度驗證失敗', async () => {
            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'short1' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(defaultMockAuth.login).not.toHaveBeenCalled();
        });

        it('密碼格式驗證失敗', async () => {
            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            // Only numbers
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: '12345678' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(defaultMockAuth.login).not.toHaveBeenCalled();

            // Only letters
            fireEvent.change(passwordInput, { target: { value: 'abcdefgh' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(defaultMockAuth.login).not.toHaveBeenCalled();
        });
    });

    describe('驗證權限', () => {
        it('已登入狀態下訪問登入頁', async () => {
            mockUseAuth.mockReturnValue({
                ...defaultMockAuth,
                isAuthenticated: true
            });

            renderLoginPage();

            // Verify redirection to /dashboard
            expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
        });

        it('顯示登入過期提示', () => {
            mockUseAuth.mockReturnValue({
                ...defaultMockAuth,
                authExpiredMessage: '登入已過期'
            });

            renderLoginPage();

            expect(screen.getByRole('alert')).toHaveTextContent('登入已過期');
            expect(defaultMockAuth.clearAuthExpiredMessage).toHaveBeenCalled();
        });
    });

    describe('Mock API', () => {
        it('登入載入中狀態顯示', async () => {
            // Let login hang
            let resolveLogin: any;
            defaultMockAuth.login.mockReturnValue(new Promise((resolve) => {
                resolveLogin = resolve;
            }));

            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('登入中...')).toBeInTheDocument();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(submitButton).toBeDisabled();

            resolveLogin(); // cleanup
        });

        it('登入成功後導向', async () => {
            defaultMockAuth.login.mockResolvedValue(true);

            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
            fireEvent.click(submitButton);

            expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        it('登入失敗顯示錯誤訊息', async () => {
            const error: any = new Error('Request failed');
            error.response = { data: { message: '找不到此帳號' } };
            defaultMockAuth.login.mockRejectedValue(error);

            renderLoginPage();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('找不到此帳號')).toBeInTheDocument();
        });
    });
});
