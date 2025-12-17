
import React, { useState, useEffect } from 'react';
import { fetchRegulatoryNewsAI } from '../services/geminiService';
import { Loader2, Globe, ExternalLink, RefreshCw, Shield, AlertCircle } from 'lucide-react';

export const RegulatoryNews: React.FC = () => {
    const [country, setCountry] = useState('United States');
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
        "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
        "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
        "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
        "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "European Union",
        "Fiji", "Finland", "France",
        "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
        "Haiti", "Honduras", "Hungary",
        "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
        "Jamaica", "Japan", "Jordan",
        "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
        "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
        "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
        "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
        "Oman",
        "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
        "Qatar",
        "Romania", "Russia", "Rwanda",
        "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
        "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
        "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
        "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
        "Yemen",
        "Zambia", "Zimbabwe"
    ];

    useEffect(() => {
        loadNews();
    }, [country]);

    const loadNews = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchRegulatoryNewsAI(country);
            if (result && result.updates && Array.isArray(result.updates)) {
                setNews(result.updates);
            } else {
                setNews([]); // No updates found or parsing error
            }
        } catch (e) {
            console.error(e);
            setError('Failed to fetch regulatory updates. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="text-blue-600" /> Regulatory News Portal
                    </h2>
                    <p className="text-slate-500">Official HSE updates and safety alerts powered by Google Search.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[200px]"
                    >
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button 
                        onClick={loadNews}
                        disabled={loading}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        title="Refresh News"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="text-blue-600 shrink-0 mt-1" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">AI Verified Sources</p>
                    <p>This portal uses real-time search to find official updates from regulators (e.g. OSHA, HSE). Always verify details on the official government website linked below.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center text-slate-500">
                    <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600" />
                    <p>Searching official databases for {country}...</p>
                </div>
            ) : news.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <Globe size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No recent major regulatory updates found for this region.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {news.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-all">
                            <div className="mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {item.date || 'Recent'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2" title={item.title}>
                                {item.title}
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                                {item.summary}
                            </p>
                            
                            <a 
                                href={item.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                            >
                                Read Official Source <ExternalLink size={14} />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
