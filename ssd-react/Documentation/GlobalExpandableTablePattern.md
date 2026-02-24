# Global Expandable Table Pattern

This pattern allows for high-fidelity inline expansions within `DataTable` components, ideal for showing contextual details (like financial summaries) without navigating away or causing jarring layout shifts.

## Implementation Overview

### 1. Component Refactor (`DataTable.jsx`)
The `DataTable` now accepts a `renderExpansion` prop. When a row matches the `selectedId`, a new row is injected immediately below it using `React.Fragment`.

```javascript
/* DataTable.jsx */
{selectedId === row.id && renderExpansion && (
    <tr className="expansion-row">
        <td colSpan={columns.length}>
            <div className="expansion-content">
                {renderExpansion(row)}
            </div>
        </td>
    </tr>
)}
```

### 2. Styling (`DataTable.css`)
Expansion rows are styled with a subtle `slideDown` animation and a left border accent to differentiate them from standard data rows.

```css
.expansion-content {
    padding: 20px;
    animation: slideDown 0.3s ease-out;
    border-left: 4px solid var(--primary);
    background: var(--bg-secondary);
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

## How to Use Globally

To apply this pattern to any other table:

1. **Define the Expansion**: Create a function that returns the JSX for the detailed view.
2. **Pass to DataTable**: Pass this function to the `renderExpansion` prop.
3. **Trigger**: Ensure `selectedId` is updated (usually via `onRowClick`).

### Example Usage
```javascript
function renderPersonnelDetails(worker) {
    return <WorkerDetails worker={worker} />;
}

<DataTable 
    columns={cols} 
    data={workers} 
    selectedId={currentWorkerId}
    onRowClick={(w) => setCurrentWorkerId(w.id)}
    renderExpansion={renderPersonnelDetails}
/>
```

## Benefits
- **Context Preservation**: Users stay in the same visual location.
- **Improved UX**: Prevents unintended modal "fatigue".
- **Responsive**: Naturally scales with the table width.
