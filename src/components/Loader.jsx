// Full-page and inline loading spinner
const Loader = ({ fullPage = true, size = 'lg' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-14 h-14 border-4',
    };

    const spinner = (
        <div className={`${sizeClasses[size]} border-dark-600 border-t-primary-500 rounded-full animate-spin`} />
    );

    if (!fullPage) {
        return <div className="flex justify-center items-center p-8">{spinner}</div>;
    }

    return (
        <div className="min-h-screen bg-custom-gradient flex flex-col items-center justify-center gap-4">
            {spinner}
            <p className="text-dark-400 text-sm animate-pulse">Loading...</p>
        </div>
    );
};

export default Loader;
