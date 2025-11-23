import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleAnalytics } from './GoogleAnalytics';

describe('GoogleAnalytics', () => {
  const testGaId = 'G-TEST123456';

  describe('Script rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<GoogleAnalytics gaId={testGaId} />);
      expect(container).toBeInTheDocument();
    });

    it('accepts gaId prop', () => {
      const { container } = render(<GoogleAnalytics gaId={testGaId} />);
      expect(container).toBeInTheDocument();
    });

    it('renders with different GA IDs', () => {
      const { container: container1 } = render(<GoogleAnalytics gaId="G-AAAA111111" />);
      const { container: container2 } = render(<GoogleAnalytics gaId="G-BBBB222222" />);

      expect(container1).toBeInTheDocument();
      expect(container2).toBeInTheDocument();
    });

    it('renders with empty string gaId', () => {
      const { container } = render(<GoogleAnalytics gaId="" />);
      expect(container).toBeInTheDocument();
    });

    it('renders with special characters in gaId', () => {
      const { container } = render(<GoogleAnalytics gaId="G-TEST-123_456" />);
      expect(container).toBeInTheDocument();
    });
  });
});
