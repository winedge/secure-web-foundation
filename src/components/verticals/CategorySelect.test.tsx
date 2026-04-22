import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategorySelect } from './CategorySelect';

// Mock posthog tracker - not under test here
vi.mock('@/lib/posthog', () => ({
  trackEvent: vi.fn(),
}));

// Mock useVertical to return a known vertical with NO categories so the
// free-text empty state renders. The 'solar' preset has 4 example
// categories, which lets us assert we only render the first 3.
vi.mock('@/hooks/use-vertical', () => ({
  useVertical: () => ({
    categories: [],
    isLoading: false,
    vertical: { slug: 'solar', name: 'Solar & Energy' },
    term: (_key: string, fallback?: string) => fallback ?? 'Category',
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CategorySelect - free-text empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders up to 3 vertical-specific example chips when no categories exist', () => {
    const onChange = vi.fn();
    renderWithRouter(<CategorySelect value="" onChange={onChange} />);

    // The 'solar' preset defines: ['Residential','Commercial','Battery','EV Charger']
    // We expect the first 3 to render as chips.
    expect(screen.getByText('Residential')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Battery')).toBeInTheDocument();

    // The 4th example must NOT render (cap at 3).
    expect(screen.queryByText('EV Charger')).not.toBeInTheDocument();

    // "Try:" prefix should also be present
    expect(screen.getByText('Try:')).toBeInTheDocument();
  });

  it('clicking a chip calls onChange with that example value', () => {
    const onChange = vi.fn();
    renderWithRouter(<CategorySelect value="" onChange={onChange} />);

    const chip = screen.getByText('Battery');
    fireEvent.click(chip);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Battery');
  });

  it('the free-text input reflects the value prop', () => {
    const { rerender } = renderWithRouter(
      <CategorySelect value="" onChange={() => {}} />,
    );

    const input = screen.getByPlaceholderText(/e\.g\. Residential/i) as HTMLInputElement;
    expect(input.value).toBe('');

    rerender(
      <MemoryRouter>
        <CategorySelect value="Battery" onChange={() => {}} />
      </MemoryRouter>,
    );

    const updated = screen.getByDisplayValue('Battery') as HTMLInputElement;
    expect(updated.value).toBe('Battery');
  });
});
