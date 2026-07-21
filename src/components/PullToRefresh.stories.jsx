import PullToRefresh from './PullToRefresh.jsx';

export default {
  title: 'Components/PullToRefresh',
  component: PullToRefresh,
  tags: ['autodocs'],
};

const mockRefresh = () => new Promise((resolve) => setTimeout(resolve, 1500));

export const Default = {
  args: {
    onRefresh: mockRefresh,
    children: (
      <div
        style={{
          padding: '1rem',
          background: 'var(--color-surface)',
          borderRadius: '8px',
        }}
      >
        <p style={{ margin: 0 }}>
          Pull down on mobile / touch screen to trigger refresh.
        </p>
      </div>
    ),
  },
};
