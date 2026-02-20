import StarBorder from './StarBorder';
import './Card.css';

export default function Card({ title, children, className = '', color, speed, ...props }) {
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
}
