const Table = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children }) => {
  return (
    <thead className="bg-gray-50 dark:bg-gray-900">
      <tr>{children}</tr>
    </thead>
  );
};

const TableHeaderCell = ({ children, className = '' }) => {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
};

const TableBody = ({ children }) => {
  return <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>;
};

const TableRow = ({ children, className = '' }) => {
  return <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}>{children}</tr>;
};

const TableCell = ({ children, className = '' }) => {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  );
};

Table.Header = TableHeader;
Table.HeaderCell = TableHeaderCell;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;

export default Table;
