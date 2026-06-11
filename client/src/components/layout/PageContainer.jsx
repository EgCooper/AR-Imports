export default function PageContainer({ children, className = '', size = 'default' }) {
  const maxWidth = size === 'narrow' ? 'max-w-3xl' : size === 'wide' ? 'max-w-7xl' : 'max-w-5xl';

  return (
    <div
      className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 md:px-8 lg:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
