import React, { useState, useEffect } from 'react';
import { Site, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Plus, Users, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';

// Local storage helpers for sites/teams
const SITES_KEY = 'safedify_sites';
const TEAMS_KEY = 'safedify_teams';

const getSites = (): Site[] => {
    try { return JSON.parse(localStorage.getItem(SITES_KEY) || '[]'); } catch { return []; }
};
const saveSites = (sites: Site[]) => localStorage.setItem(SITES_KEY, JSON.stringify(sites));

const getTeams = (): Team[] => {
    try { return JSON.parse(localStorage.getItem(TEAMS_KEY) || '[]'); } catch { return []; }
};
const saveTeams = (teams: Team[]) => localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));

export const SiteManagement: React.FC = () => {
    const { user } = useAuth();
    const [sites, setSites] = useState<Site[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTab, setActiveTab] = useState<'sites' | 'teams'>('sites');
    const [showSiteForm, setShowSiteForm] = useState(false);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [search, setSearch] = useState('');

    // Site form state
    const [siteForm, setSiteForm] = useState({
        name: '', code: '', location: '', address: '', contactPerson: '', contactPhone: '', status: 'Active' as Site['status']
    });

    // Team form state
    const [teamForm, setTeamForm] = useState({
        name: '', siteId: '', department: '', leaderName: '', memberCount: 0
    });

    useEffect(() => {
        setSites(getSites());
        setTeams(getTeams());
    }, []);

    const handleSaveSite = () => {
        if (!siteForm.name || !siteForm.code || !siteForm.location) {
            toast.error('Name, code, and location are required');
            return;
        }
        if (editingSite) {
            const updated = sites.map(s => s.id === editingSite.id ? { ...s, ...siteForm } : s);
            setSites(updated);
            saveSites(updated);
            toast.success('Site updated');
        } else {
            const newSite: Site = {
                id: `site-${Date.now()}`,
                ...siteForm,
                companyId: user?.companyId || 'default',
                createdAt: new Date().toISOString(),
            };
            const updated = [...sites, newSite];
            setSites(updated);
            saveSites(updated);
            toast.success('Site created');
        }
        resetSiteForm();
    };

    const handleSaveTeam = () => {
        if (!teamForm.name || !teamForm.siteId || !teamForm.department) {
            toast.error('Name, site, and department are required');
            return;
        }
        if (editingTeam) {
            const updated = teams.map(t => t.id === editingTeam.id ? { ...t, ...teamForm } : t);
            setTeams(updated);
            saveTeams(updated);
            toast.success('Team updated');
        } else {
            const newTeam: Team = {
                id: `team-${Date.now()}`,
                ...teamForm,
                memberCount: Number(teamForm.memberCount) || 0,
                createdAt: new Date().toISOString(),
            };
            const updated = [...teams, newTeam];
            setTeams(updated);
            saveTeams(updated);
            toast.success('Team created');
        }
        resetTeamForm();
    };

    const deleteSite = (id: string) => {
        if (!confirm('Delete this site? All associated teams will remain.')) return;
        const updated = sites.filter(s => s.id !== id);
        setSites(updated);
        saveSites(updated);
        toast.success('Site deleted');
    };

    const deleteTeam = (id: string) => {
        if (!confirm('Delete this team?')) return;
        const updated = teams.filter(t => t.id !== id);
        setTeams(updated);
        saveTeams(updated);
        toast.success('Team deleted');
    };

    const resetSiteForm = () => {
        setSiteForm({ name: '', code: '', location: '', address: '', contactPerson: '', contactPhone: '', status: 'Active' });
        setShowSiteForm(false);
        setEditingSite(null);
    };

    const resetTeamForm = () => {
        setTeamForm({ name: '', siteId: '', department: '', leaderName: '', memberCount: 0 });
        setShowTeamForm(false);
        setEditingTeam(null);
    };

    const startEditSite = (site: Site) => {
        setEditingSite(site);
        setSiteForm({ name: site.name, code: site.code, location: site.location, address: site.address || '', contactPerson: site.contactPerson || '', contactPhone: site.contactPhone || '', status: site.status });
        setShowSiteForm(true);
    };

    const startEditTeam = (team: Team) => {
        setEditingTeam(team);
        setTeamForm({ name: team.name, siteId: team.siteId, department: team.department, leaderName: team.leaderName || '', memberCount: team.memberCount });
        setShowTeamForm(true);
    };

    const filteredSites = sites.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
    const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.department.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Site & Team Management</h2>
                    <p className="text-slate-500">Manage project sites and team assignments.</p>
                </div>
                <button
                    onClick={() => activeTab === 'sites' ? setShowSiteForm(true) : setShowTeamForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Add {activeTab === 'sites' ? 'Site' : 'Team'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('sites')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 size={16} /> Sites ({sites.length})
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} /> Teams ({teams.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            </div>

            {/* Sites View */}
            {activeTab === 'sites' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSites.map(site => (
                        <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Building2 size={20} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{site.name}</h3>
                                        <span className="text-xs font-mono text-slate-400">{site.code}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                    site.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    site.status === 'Inactive' ? 'bg-slate-100 text-slate-500' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {site.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                                <MapPin size={14} /> {site.location}
                            </div>
                            {site.contactPerson && (
                                <p className="text-xs text-slate-400">Contact: {site.contactPerson} {site.contactPhone ? `• ${site.contactPhone}` : ''}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">Teams: {teams.filter(t => t.siteId === site.id).length}</p>
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                <button onClick={() => startEditSite(site)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Pencil size={12} /> Edit</button>
                                <button onClick={() => deleteSite(site.id)} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                            </div>
                        </div>
                    ))}
                    {filteredSites.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <Building2 size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No sites found. Add your first project site.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Teams View */}
            {activeTab === 'teams' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeams.map(team => {
                        const site = sites.find(s => s.id === team.siteId);
                        return (
                            <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                            <Users size={20} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{team.name}</h3>
                                            <span className="text-xs text-slate-400">{team.department}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-blue-600">
                                        {team.memberCount} members
                                    </span>
                                </div>
                                {site && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                        <Building2 size={12} /> {site.name} ({site.code})
                                    </div>
                                )}
                                {team.leaderName && <p className="text-xs text-slate-400">Leader: {team.leaderName}</p>}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button onClick={() => startEditTeam(team)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Pencil size={12} /> Edit</button>
                                    <button onClick={() => deleteTeam(team.id)} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredTeams.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <Users size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No teams found. Create a team and assign to a site.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Site Form Modal */}
            {showSiteForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{editingSite ? 'Edit Site' : 'Add New Site'}</h3>
                            <button onClick={resetSiteForm} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Site Name *</label>
                                    <input type="text" value={siteForm.name} onChange={e => setSiteForm({...siteForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Dubai Marina Tower" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Site Code *</label>
                                    <input type="text" value={siteForm.code} onChange={e => setSiteForm({...siteForm, code: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono" placeholder="DXB-01" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                                <input type="text" value={siteForm.location} onChange={e => setSiteForm({...siteForm, location: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="City, Country" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <input type="text" value={siteForm.address} onChange={e => setSiteForm({...siteForm, address: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                    <input type="text" value={siteForm.contactPerson} onChange={e => setSiteForm({...siteForm, contactPerson: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={siteForm.contactPhone} onChange={e => setSiteForm({...siteForm, contactPhone: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select value={siteForm.status} onChange={e => setSiteForm({...siteForm, status: e.target.value as Site['status']})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Under Construction">Under Construction</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={resetSiteForm} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveSite} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingSite ? 'Update' : 'Create'} Site</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Form Modal */}
            {showTeamForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{editingTeam ? 'Edit Team' : 'Create New Team'}</h3>
                            <button onClick={resetTeamForm} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Team Name *</label>
                                <input type="text" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Night Shift Safety" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Site *</label>
                                <select value={teamForm.siteId} onChange={e => setTeamForm({...teamForm, siteId: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm">
                                    <option value="">Select a site</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                                    <input type="text" value={teamForm.department} onChange={e => setTeamForm({...teamForm, department: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Construction" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Member Count</label>
                                    <input type="number" min="0" value={teamForm.memberCount} onChange={e => setTeamForm({...teamForm, memberCount: parseInt(e.target.value) || 0})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Team Leader</label>
                                <input type="text" value={teamForm.leaderName} onChange={e => setTeamForm({...teamForm, leaderName: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="Leader name" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={resetTeamForm} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveTeam} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingTeam ? 'Update' : 'Create'} Team</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
