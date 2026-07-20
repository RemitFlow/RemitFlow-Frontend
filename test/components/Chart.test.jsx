import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Chart from '../../src/components/Chart.jsx';

describe('Chart component', () => {
  it('renders correctly', () => {
    const data = [{ value: 10 }, { value: 20 }];
    render(<Chart data={data} title="Test Chart" />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });
});
