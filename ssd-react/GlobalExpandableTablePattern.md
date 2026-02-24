# Global Expandable Table Pattern

This document outlines the standard implementation for the high-fidelity inline expandable table pattern used across the SSD Constructions application. This pattern allows users to view contextual details without leaving the list view, avoiding layout shifts and improving UX efficiency.

## Overview

The pattern replaces traditional "split-view" or "sidebar-details" layouts with a row-based expansion that pushes content down rather than opening modal overlays for simple reference data.

## 1. Component Support (`DataTable.jsx`)

The `DataTable` component supports expansion via the `renderExpansion` prop.

```javascript
// DataTable.jsx usage
<DataTable 
    columns={columns} 
    data={filteredData} 
    selectedId={selectedId} 
    onRowClick={handleRowSelection} 
    renderExpansion={(row) => <MyExpansionComponent data={row} />}
/>
```

### CSS Requirements (`DataTable.css`)

The table requires specific handling for the expansion row to ensure it blends seamlessly:

```css
.expansion-row td {
    padding: 0 !important;
    border-bottom: 1px solid var(--border-color) !important;
}

.expansion-content {
    padding: 24px;
    background: var(--bg-secondary);
    border-left: 4px solid var(--primary);
    animation: slideDown 0.3s ease-out;
}
```

## 2. Implementation Guide

### A. Selection Logic
Modify `onRowClick` to toggle selection. If the same row is clicked twice, it should collapse.

```javascript
function handleRowSelection(row) {
    if (selectedId === row.id) {
        setSelectedId(null);
    } else {
        setSelectedId(row.id);
        // Load additional dependencies if needed
    }
}
```

### B. Expansion Renderer
Create a semantic grid (usually 2-col) to display the "Hidden" details.

```javascript
function renderExpansion(row) {
    return (
        <div className="expansion-grid">
            <div className="expansion-col">
                <h4>Related History</h4>
                {/* List of related records */}
            </div>
            <div className="expansion-col">
                <h4>Detailed Metadata</h4>
                {/* Key-Value pairs or Notes */}
                <div className="actions">
                    <button onClick={() => openEditModal(row)}>Edit</button>
                </div>
            </div>
        </div>
    );
}
```

## 3. Standard Styling Guidelines

1.  **Border Left Accent**: Always use a 4px left border matching the primary theme color or the transaction type (e.g., Green for Money In, Red for Money Out).
2.  **Internal Grids**: Use a `grid-template-columns: 1fr 1fr` for the expansion content with a gap of at least `24px`.
3.  **Labels**: Use `font-size: 0.6875rem`, `text-transform: uppercase`, and `color: var(--text-muted)` for labels within the expansion.
4.  **Notes**: Display notes in a card-like box with `background: #f8fafc` and a dashed border.

## 4. Rollout Progress

| Module | Status | Content |
| :--- | :--- | :--- |
| Projects | [x] | Financial Summary (Budget vs Actual) |
| Workers | [x] | Assignment History & Phone/Notes |
| Materials | [x] | Project Assignments & Supplier Info |
| Suppliers | [x] | Linked Materials & Contact Details |
| Payments | [x] | Transaction Method, Refs & Entity Context |
| Advances | [ ] | Worker History & Project Mapping |
| Personnel Command | [ ] | Identity & Forensic Intelligence |
