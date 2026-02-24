import React from 'react';
import './DataTable.css';

const DataTable = React.memo(({ columns, data, selectedId, onRowClick, emptyMessage = 'No data found', renderExpansion }) => {
    return (
        <div className="data-table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} style={col.width ? { width: col.width } : {}}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="data-table-empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <React.Fragment key={row.id}>
                                <tr
                                    className={selectedId === row.id ? 'selected' : ''}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                                {selectedId === row.id && renderExpansion && (
                                    <tr className="expansion-row">
                                        <td colSpan={columns.length}>
                                            <div className="expansion-content">
                                                {renderExpansion(row)}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default DataTable;
