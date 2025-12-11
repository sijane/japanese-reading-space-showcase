
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { type Statistics as StatisticsType, type JlptDistribution } from '../types';

interface StatisticsProps {
    stats: StatisticsType;
}

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
    <div className="bg-slate-800 p-4 rounded-lg text-center border border-slate-700">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-indigo-400">{value}</p>
    </div>
);

export const Statistics: React.FC<StatisticsProps> = ({ stats }) => {
    const chartData = [
        { name: 'N5', count: stats.jlptDistribution.n5, fill: '#818cf8' },
        { name: 'N4', count: stats.jlptDistribution.n4, fill: '#60a5fa' },
        { name: 'N3', count: stats.jlptDistribution.n3, fill: '#38bdf8' },
        { name: 'N2', count: stats.jlptDistribution.n2, fill: '#22d3ee' },
        { name: 'N1', count: stats.jlptDistribution.n1, fill: '#06b6d4' },
        { name: 'Unknown', count: stats.jlptDistribution.unknown, fill: '#64748b' },
    ];

    return (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-100 mb-4">Text Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Words" value={stats.totalWords} />
                <StatCard title="Unique Words" value={stats.uniqueWords} />
                <StatCard title="Characters" value={stats.characterCount} />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">JLPT Level Distribution</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                            labelStyle={{ color: '#cbd5e1' }}
                            itemStyle={{ fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(71, 85, 105, 0.3)' }}
                        />
                        <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
