import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ProTableProps } from '@ant-design/pro-components';
import './ResponsiveTable.css';

// Remove fixed and width from columns
function processColumns<T extends Record<string, any>>(
  columns: ProColumns<T>[]
): ProColumns<T>[] {
  return columns.map(col => {
    // Remove fixed and width properties
    const { fixed, width, ...cleanCol } = col as any;
    
    return {
      ...cleanCol,
      // Enable ellipsis by default
      ellipsis: cleanCol.ellipsis !== false,
      // Remove any fixed positioning
      fixed: undefined,
      // Let the table auto-calculate widths  
      width: undefined,
    };
  });
}

export function AutoWidthProTable<T extends Record<string, any>>(
  props: ProTableProps<T, any>
) {
  const { columns, scroll, className = '', ...restProps } = props;
  
  // Process columns to remove fixed properties
  const processedColumns = columns ? processColumns(columns) : [];
  
  return (
    <div className="responsive-table-wrapper">
      <ProTable<T>
        {...restProps}
        columns={processedColumns}
        className={`responsive-table ${className}`}
        scroll={{
          x: 'max-content',
          y: scroll?.y
        }}
        options={{
          ...props.options,
          density: false, // Remove density toggle on mobile
          fullScreen: false, // Remove fullscreen on mobile
        }}
        pagination={{
          ...props.pagination,
          responsive: true,
          showSizeChanger: window.innerWidth > 768,
        }}
      />
    </div>
  );
}

export default AutoWidthProTable;