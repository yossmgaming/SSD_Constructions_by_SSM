import React from 'react';
import StarBorder from './StarBorder';
import './Card.css';

const Card = React.memo(({ title, children, className = '', color, speed, ...props }) => {
    return (
        <StarBorder
            as="div"
            className={`card ${className}`}
            color={color || '#6366f1'}
            speed={speed || '5s'}
            {...props}
        >
            {title && <h3 className="card-title">{title}</h3>}
            {children}
        </StarBorder>
    );
});

export default Card;
