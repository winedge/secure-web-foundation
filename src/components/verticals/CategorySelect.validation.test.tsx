import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategorySelect } from './CategorySelect';

vi.mock('@/lib/posthog', () => ({
  trackEvent: vi.fn(),
}));

// Hoisted mutable mock state so individual tests can reconfigure useVertical.
const mockState = vi.hoisted(() => ({
  categories: [] as Array<{ id: string; key: string; label: string }>,
  isLoading: false,
  vertical: { slug: 'solar', name: 'Solar & Energy' } as { slug: string; name: string } | null,
}));

vi.mock('@/hooks/use-vertical', () => ({
  useVertical: () => ({
    categories: mockState.categories,
    isLoading: mockState.isLoading,
    vertical: mockState.vertical,
    term: (_key: string, fallback?: string) => fallback ?? 'Category',
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CategorySelect - inline error visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.categories = [];
    mockState.isLoading = false;
    mockState.vertical = { slug: 'solar', name: 'Solar & Energy' };
  });

  it('does NOT show inline required error before blur or submit', () => {
    renderWithRouter(
      <CategorySelect value="" onChange={() => {}} required />,
    );
    // No alert/error node should be rendered yet
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText(/e\.g\./i);
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows inline required error after the input is blurred', () => {
    renderWithRouter(
      <CategorySelect value="" onChange={() => {}} required />,
    );
    const input = screen.getByPlaceholderText(/e\.g\./i);
    fireEvent.blur(input);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/required/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows inline required error immediately when showError is true (submit attempt)', () => {
    renderWithRouter(
      <CategorySelect value="" onChange={() => {}} required showError />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/required/i);
  });

  it('keeps the error visible across re-renders once showError flipped to true', () => {
    const { rerender } = renderWithRouter(
      <CategorySelect value="" onChange={() => {}} required showError />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Parent toggles showError back off (e.g. user starts editing again).
    rerender(
      <MemoryRouter>
        <CategorySelect value="" onChange={() => {}} required showError={false} />
      </MemoryRouter>,
    );
    // Touched is sticky -> error must remain visible while value is still empty.
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides the inline error once a non-empty value is provided', () => {
    const { rerender } = renderWithRouter(
      <CategorySelect value="" onChange={() => {}} required showError />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CategorySelect value="Battery" onChange={() => {}} required showError />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows external error prop immediately, even without blur/submit', () => {
    renderWithRouter(
      <CategorySelect value="" onChange={() => {}} error="Server says no" />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Server says no');
  });
});

describe('CategorySelect - free-text fallback disabled (blocked state)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.categories = [];
    mockState.isLoading = false;
    mockState.vertical = { slug: 'solar', name: 'Solar & Energy' };
  });

  it('renders the blocked empty-state message instead of the free-text input', () => {
    renderWithRouter(
      <CategorySelect
        value=""
        onChange={() => {}}
        allowFreeTextFallback={false}
      />,
    );
    // No free-text input should exist
    expect(screen.queryByPlaceholderText(/e\.g\./i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter/i)).not.toBeInTheDocument();

    // Blocked message must be visible (uses the blocked description copy)
    expect(
      screen.getByText(/No category options configured for Solar & Energy/i),
    ).toBeInTheDocument();
  });

  it('shows the blocking error when required + showError, even without any input', () => {
    renderWithRouter(
      <CategorySelect
        value=""
        onChange={() => {}}
        required
        showError
        allowFreeTextFallback={false}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/required/i);
  });

  it('reports invalid via onValidityChange when required + fallback disabled + no categories', () => {
    const onValidityChange = vi.fn();
    renderWithRouter(
      <CategorySelect
        value=""
        onChange={() => {}}
        required
        allowFreeTextFallback={false}
        onValidityChange={onValidityChange}
      />,
    );
    // The mount-time effect should have fired with `false`.
    expect(onValidityChange).toHaveBeenCalledWith(false);
  });
});
