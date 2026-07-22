// Lazy-loaded charts to optimize bundle size
import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar 
} from 'recharts';

interface ChartData {
    [key: string]: any;
}

interface HSEChartProps {
    data: ChartData[];
    type: 'bar' | 'pie' | 'line' | 'area' | 'radial';
    colors?: string[];
    height?: number;
    dataKey?: string;
    nameKey?: string;
}

export const HSEChart: React.FC<HSEChartProps> = ({ 
    data, 
    type, 
    colors = ['#3b82f6', '#ef4444', '#f97316', '#eab308', '#10b981'],
    height = 200,
    dataKey = 'value',
    nameKey = 'name'
}) => {
    const chartHeight = Math.max(height, 200);
    const chartMinWidth = 300;

    switch (type) {
        case 'bar':
            return (
                <div className="h-64 w-full" style={{ minHeight: `${chartHeight}px`, minWidth: `${chartMinWidth}px` }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={chartMinWidth} minHeight={chartHeight}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey={nameKey} tick={{fontSize: 12}} />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'pie':
            return (
                <div className="h-64 w-full" style={{ minHeight: `${chartHeight}px`, minWidth: `${chartMinWidth}px` }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={chartMinWidth} minHeight={chartHeight}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                dataKey={dataKey}
                                nameKey={nameKey}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'line':
            return (
                <div className="h-64 w-full" style={{ minHeight: `${chartHeight}px`, minWidth: `${chartMinWidth}px` }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={chartMinWidth} minHeight={chartHeight}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={nameKey} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey={dataKey} stroke={colors[0]} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'area':
            return (
                <div className="h-64 w-full" style={{ minHeight: `${chartHeight}px`, minWidth: `${chartMinWidth}px` }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={chartMinWidth} minHeight={chartHeight}>
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={nameKey} />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey={dataKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            );

        default:
            return <div>Chart type not supported</div>;
    }
};