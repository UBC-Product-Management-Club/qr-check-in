import logoGradient from '../assets/pmclogo-gradient.png';
import logoWhite from '../assets/pmclogo.svg';

/** PMC logo: white on the dark scheme, gradient on the light scheme (swapped in index.css). */
export default function Logo({ className = '' }: { className?: string }) {
    return (
        <>
            <img src={logoWhite} alt="PMC" className={`logo-on-dark ${className}`} />
            <img src={logoGradient} alt="PMC" className={`logo-on-light ${className}`} />
        </>
    );
}
