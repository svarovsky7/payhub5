import React from 'react';
import { Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import './ResponsiveTable.css';

export interface ResponsiveTableColumn<T = any> extends Omit<ColumnsType<T>[0], 'width' | 'fixed'> {
  minWidth?: number;
  maxWidth?: number;
  priority?: number; // For responsive hiding
}

export interface ResponsiveTableProps<T = any> extends Omit<TableProps<T>, 'columns' | 'scroll'> {
  columns: ResponsiveTableColumn<T>[];
  responsive?: boolean;
}

export const ResponsiveTable = <T extends Record<string, any>>({
  columns,
  responsive = true,
  className = '',
  ...tableProps
}: ResponsiveTableProps<T>) => {
  
  // Process columns to remove fixed properties and handle width
  const processedColumns = columns.map(col => {
    const { minWidth, maxWidth, priority, ...restCol } = col;
    
    // Remove any fixed or width properties
    const { fixed, width, ...cleanCol } = restCol as any;
    
    return {
      ...cleanCol,
      // Use ellipsis for all text columns
      ellipsis: cleanCol.ellipsis !== false,
      // Remove any fixed positioning
      fixed: undefined,
      // Let the table auto-calculate widths
      width: undefined,
    };
  });

  return (
    <div className={`responsive-table-wrapper ${className}`}>
      <Table<T>
        {...tableProps}
        columns={processedColumns}
        className="responsive-table"
        // Enable horizontal scroll but no fixed columns
        scroll={{ 
          x: 'max-content',
          y: tableProps.scroll?.y 
        }}
        // Responsive breakpoints
        size={window.innerWidth < 768 ? 'small' : 'middle'}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['50', '100', '200'],
          showSizeChanger: true,
          showQuickJumper: window.innerWidth >= 768,
          ...tableProps.pagination,
          responsive: true,
          showTotal: (total, range) => 
            window.innerWidth < 768 
              ? `${range[0]}-${range[1]}/${total}`
              : `${range[0]}-${range[1]} из ${total} записей`,
        }}
      />
    </div>
  );
};

export default ResponsiveTable;