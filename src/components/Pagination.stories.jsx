import { useState } from 'react';
import Pagination from './Pagination.jsx';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  tags: ['autodocs'],
};

export const Interactive = {
  render: () => {
    const [page, setPage] = useState(1);
    return <Pagination page={page} totalPages={5} onChange={setPage} />;
  },
};

export const FirstPage = {
  args: { page: 1, totalPages: 5, onChange: () => {} },
};

export const MiddlePage = {
  args: { page: 3, totalPages: 5, onChange: () => {} },
};

export const LastPage = {
  args: { page: 5, totalPages: 5, onChange: () => {} },
};
