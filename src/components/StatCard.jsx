// Dashboard stat card component
const StatCard = ({ icon, label, value, color = 'primary', trend }) => {
    const colorMap = {
        primary: 'from-primary-500/20 to-primary-600/5 text-primary-400 border-primary-500/20',
        success: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
        warning: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20',
        info: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
        purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
    };

    const iconColorMap = {
        primary: 'bg-primary-500/20 text-primary-400',
        success: 'bg-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/20 text-amber-400',
        info: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-dark-400 text-sm font-medium">{label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {trend && (
                        <p className={`text-xs mt-2 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from yesterday
                        </p>
                    )}
                </div>
                <div className={`p-4 rounded-xl ${iconColorMap[color]}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
