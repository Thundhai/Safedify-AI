
import React, { useState, useEffect } from 'react';
import { getEmergencyContacts, getEmergencyDrills, saveEmergencyDrill, saveEmergencyContact, deleteEmergencyContact } from '../services/storageService';
import { compressImage } from '../services/offlineService';
import { EmergencyContact, EmergencyDrill, EmergencyContactType } from '../types';
import { 
    Phone, MapPin, Users, History, AlertTriangle, Shield, Navigation, 
    Ambulance, Flame, UserCheck, Loader2, CheckCircle, Clock, X, FileText, Upload, List,
    Globe, Plus, Trash2, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

// Comprehensive Global Emergency Numbers
const GLOBAL_EMERGENCY_DATA: Record<string, EmergencyContact[]> = {
    'United States': [
        { id: 'us-1', name: 'Emergency (All)', role: 'General', phone: '911', type: 'External Service' },
        { id: 'us-2', name: 'Poison Control', role: 'Medical', phone: '1-800-222-1222', type: 'External Service' }
    ],
    'United Kingdom': [
        { id: 'uk-1', name: 'Emergency (All)', role: 'General', phone: '999', type: 'External Service' },
        { id: 'uk-2', name: 'Non-Emergency Police', role: 'Police', phone: '101', type: 'External Service' },
        { id: 'uk-3', name: 'NHS Medical Help', role: 'Medical', phone: '111', type: 'External Service' }
    ],
    'Canada': [
        { id: 'ca-1', name: 'Emergency (All)', role: 'General', phone: '911', type: 'External Service' }
    ],
    'Australia': [
        { id: 'au-1', name: 'Emergency (All)', role: 'General', phone: '000', type: 'External Service' },
        { id: 'au-2', name: 'SES (Storm/Flood)', role: 'Rescue', phone: '132 500', type: 'External Service' }
    ],
    'New Zealand': [
        { id: 'nz-1', name: 'Emergency (All)', role: 'General', phone: '111', type: 'External Service' }
    ],
    'India': [
        { id: 'in-1', name: 'National Emergency', role: 'General', phone: '112', type: 'External Service' },
        { id: 'in-2', name: 'Police', role: 'Police', phone: '100', type: 'External Service' },
        { id: 'in-3', name: 'Ambulance', role: 'Medical', phone: '102', type: 'External Service' },
        { id: 'in-4', name: 'Fire', role: 'Fire', phone: '101', type: 'External Service' }
    ],
    'China': [
        { id: 'cn-1', name: 'Police', role: 'Police', phone: '110', type: 'External Service' },
        { id: 'cn-2', name: 'Ambulance', role: 'Medical', phone: '120', type: 'External Service' },
        { id: 'cn-3', name: 'Fire', role: 'Fire', phone: '119', type: 'External Service' }
    ],
    'Japan': [
        { id: 'jp-1', name: 'Police', role: 'Police', phone: '110', type: 'External Service' },
        { id: 'jp-2', name: 'Fire & Ambulance', role: 'Fire/Medical', phone: '119', type: 'External Service' }
    ],
    'European Union (General)': [
        { id: 'eu-1', name: 'European Emergency', role: 'General', phone: '112', type: 'External Service' }
    ],
    'Germany': [
        { id: 'de-1', name: 'Police', role: 'Police', phone: '110', type: 'External Service' },
        { id: 'de-2', name: 'Fire & Ambulance', role: 'Fire/Medical', phone: '112', type: 'External Service' }
    ],
    'France': [
        { id: 'fr-1', name: 'Europe Emergency', role: 'General', phone: '112', type: 'External Service' },
        { id: 'fr-2', name: 'SAMU (Ambulance)', role: 'Medical', phone: '15', type: 'External Service' },
        { id: 'fr-3', name: 'Police', role: 'Police', phone: '17', type: 'External Service' },
        { id: 'fr-4', name: 'Fire', role: 'Fire', phone: '18', type: 'External Service' }
    ],
    'Brazil': [
        { id: 'br-1', name: 'Police', role: 'Police', phone: '190', type: 'External Service' },
        { id: 'br-2', name: 'Ambulance (SAMU)', role: 'Medical', phone: '192', type: 'External Service' },
        { id: 'br-3', name: 'Fire', role: 'Fire', phone: '193', type: 'External Service' }
    ],
    'South Africa': [
        { id: 'za-1', name: 'Police', role: 'Police', phone: '10111', type: 'External Service' },
        { id: 'za-2', name: 'Ambulance/Fire', role: 'Medical/Fire', phone: '10177', type: 'External Service' },
        { id: 'za-3', name: 'Cell Phone Emergency', role: 'General', phone: '112', type: 'External Service' }
    ],
    'Nigeria': [
        { id: 'ng-1', name: 'National Emergency', role: 'General', phone: '112', type: 'External Service' },
        { id: 'ng-2', name: 'Police', role: 'Police', phone: '199', type: 'External Service' }
    ],
    'UAE': [
        { id: 'ae-1', name: 'Police', role: 'Police', phone: '999', type: 'External Service' },
        { id: 'ae-2', name: 'Ambulance', role: 'Medical', phone: '998', type: 'External Service' },
        { id: 'ae-3', name: 'Fire', role: 'Fire', phone: '997', type: 'External Service' }
    ],
    'Saudi Arabia': [
        { id: 'sa-1', name: 'Police', role: 'Police', phone: '999', type: 'External Service' },
        { id: 'sa-2', name: 'Red Crescent (Amb)', role: 'Medical', phone: '997', type: 'External Service' },
        { id: 'sa-3', name: 'Civil Defense (Fire)', role: 'Fire', phone: '998', type: 'External Service' }
    ],
    'Russia': [
        { id: 'ru-1', name: 'General Emergency', role: 'General', phone: '112', type: 'External Service' },
        { id: 'ru-2', name: 'Fire', role: 'Fire', phone: '101', type: 'External Service' },
        { id: 'ru-3', name: 'Police', role: 'Police', phone: '102', type: 'External Service' },
        { id: 'ru-4', name: 'Ambulance', role: 'Medical', phone: '103', type: 'External Service' }
    ],
    'Mexico': [
        { id: 'mx-1', name: 'Emergency (All)', role: 'General', phone: '911', type: 'External Service' }
    ],
    'Singapore': [
        { id: 'sg-1', name: 'Police', role: 'Police', phone: '999', type: 'External Service' },
        { id: 'sg-2', name: 'Ambulance/Fire', role: 'Medical/Fire', phone: '995', type: 'External Service' }
    ]
};

export const EmergencyDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'sos' | 'contacts' | 'muster' | 'drills'>('sos');
    
    // Contacts State
    const [orgContacts, setOrgContacts] = useState<EmergencyContact[]>([]);
    const [regionalContacts, setRegionalContacts] = useState<EmergencyContact[]>([]);
    const [selectedCountry, setSelectedCountry] = useState('United States');
    const [showAddContact, setShowAddContact] = useState(false);
    
    // New Contact Form
    const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({
        name: '', role: '', phone: '', type: 'Site Medic'
    });

    const [drills, setDrills] = useState<EmergencyDrill[]>([]);
    
    // Muster State
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [checkedIn, setCheckedIn] = useState(false);

    // Drill Modal State
    const [showDrillModal, setShowDrillModal] = useState(false);
    const [newDrill, setNewDrill] = useState<Partial<EmergencyDrill>>({
        type: 'Fire Evacuation',
        date: new Date().toISOString().split('T')[0],
        location: '',
        participantsCount: 0,
        durationMinutes: 0,
        outcome: 'Success',
        notes: ''
    });
    
    // Attendance State
    const [attendanceMode, setAttendanceMode] = useState<'digital' | 'upload'>('digital');
    const [attendanceNames, setAttendanceNames] = useState('');
    const [attendanceFile, setAttendanceFile] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const load = async () => {
            await refreshContacts();
            setDrills(await getEmergencyDrills());
            // Set initial regional contacts
            setRegionalContacts(GLOBAL_EMERGENCY_DATA['United States'] ?? []);
        };
        load();
    }, []);

    const refreshContacts = async () => {
        const all = await getEmergencyContacts();
        // Filter out 'External Service' from storage as we handle them dynamically via region
        setOrgContacts(all.filter(c => c.type !== 'External Service'));
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const country = e.target.value;
        setSelectedCountry(country);
        setRegionalContacts(GLOBAL_EMERGENCY_DATA[country] || []);
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name || !newContact.phone) return;

        const contact: EmergencyContact = {
            id: `ec-${Date.now()}`,
            name: newContact.name!,
            role: newContact.role || 'Staff',
            phone: newContact.phone!,
            type: newContact.type as EmergencyContactType,
            location: newContact.location
        };

        await saveEmergencyContact(contact);
        await refreshContacts();
        setShowAddContact(false);
        setNewContact({ name: '', role: '', phone: '', type: 'Site Medic' });
    };

    const handleDeleteContact = async (id: string) => {
        if (confirm("Remove this contact?")) {
            await deleteEmergencyContact(id);
            await refreshContacts();
        }
    };

    const handleMusterCheckIn = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
                setCheckedIn(true);
            },
            (error) => {
                console.error("Error getting location", error.message);
                setIsLocating(false);
                toast.error("Unable to retrieve location. Please check GPS settings.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                if (file.type.startsWith('image/')) {
                    const compressed = await compressImage(file);
                    setAttendanceFile(compressed);
                } else {
                    const reader = new FileReader();
                    reader.onloadend = () => setAttendanceFile(reader.result as string);
                    reader.readAsDataURL(file);
                }
            } catch (err) {
                console.error(err);
                toast.error("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveDrill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDrill.location) { toast.error("Location is required"); return; }
        
        let finalCount = Number(newDrill.participantsCount);
        let finalNames: string[] = [];

        if (attendanceMode === 'digital' && attendanceNames.trim()) {
            finalNames = attendanceNames.split('\n').filter(n => n.trim() !== '');
            if (finalNames.length > 0) finalCount = finalNames.length;
        }

        const drill: EmergencyDrill = {
            id: `ed-${Date.now()}`,
            type: newDrill.type as any,
            date: newDrill.date!,
            location: newDrill.location!,
            participantsCount: finalCount,
            durationMinutes: Number(newDrill.durationMinutes),
            outcome: newDrill.outcome as any,
            notes: newDrill.notes,
            attendanceList: finalNames.length > 0 ? finalNames : undefined,
            attendanceFile: attendanceFile || undefined
        };

        await saveEmergencyDrill(drill);
        setDrills(prev => [drill, ...prev]);
        setShowDrillModal(false);
        setNewDrill({
            type: 'Fire Evacuation',
            date: new Date().toISOString().split('T')[0],
            location: '',
            participantsCount: 0,
            durationMinutes: 0,
            outcome: 'Success',
            notes: ''
        });
        setAttendanceNames('');
        setAttendanceFile(null);
        toast.success("Drill Logged Successfully");
    };

    const getContactIcon = (type: string) => {
        switch(type) {
            case 'External Service': return <AlertTriangle size={24} className="text-red-600" />;
            case 'Site Medic': return <Ambulance size={24} className="text-green-600" />;
            case 'Fire Warden': return <Flame size={24} className="text-orange-600" />;
            default: return <Shield size={24} className="text-blue-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle className="animate-pulse" /> Emergency Response
                    </h2>
                    <p className="text-slate-500">Immediate assistance and emergency protocols.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('sos')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'sos' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Phone size={18} /> SOS & Contacts
                </button>
                <button 
                    onClick={() => setActiveTab('muster')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'muster' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Navigation size={18} /> Muster Point
                </button>
                <button 
                    onClick={() => setActiveTab('drills')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'drills' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <History size={18} /> Drill Log
                </button>
            </div>

            {/* SOS / CONTACTS TAB */}
            {activeTab === 'sos' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    {/* Region Selector */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                <Globe size={24} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-blue-800 uppercase block mb-1">Select Country/Region</label>
                                <div className="relative">
                                    <select 
                                        value={selectedCountry}
                                        onChange={handleCountryChange}
                                        className="w-full md:w-64 bg-white border border-blue-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold"
                                    >
                                        {Object.keys(GLOBAL_EMERGENCY_DATA).sort().map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-blue-600 italic max-w-xs">
                            * Emergency service numbers update automatically based on your selection.
                        </div>
                    </div>

                    {/* Regional (Automatic) Contacts */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-500" /> Local Emergency Services (Auto)
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {regionalContacts.map(contact => (
                                <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                            {getContactIcon(contact.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{contact.name}</h4>
                                            <p className="text-sm text-slate-500">{contact.role}</p>
                                        </div>
                                    </div>
                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors font-bold shadow-sm whitespace-nowrap">
                                        <Phone size={18} /> {contact.phone}
                                    </a>
                                </div>
                            ))}
                            {regionalContacts.length === 0 && (
                                <div className="p-6 text-center text-slate-400">
                                    No data available for this region. Please try a neighboring country or use generic international numbers.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Organization (Manual) Contacts */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users size={16} className="text-blue-600" /> Organization Site Contacts
                            </h3>
                            <button 
                                onClick={() => setShowAddContact(true)}
                                className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-100 flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Contact
                            </button>
                        </div>
                        
                        {showAddContact && (
                            <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in fade-in">
                                <form onSubmit={handleAddContact} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                    <div>
                                        <label className="text-xs font-bold text-blue-800">Name</label>
                                        <input required type="text" className="w-full rounded border-slate-300 p-2 text-sm" placeholder="John Doe" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-800">Role</label>
                                        <input required type="text" className="w-full rounded border-slate-300 p-2 text-sm" placeholder="e.g. Site Medic" value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-800">Phone</label>
                                        <input required type="text" className="w-full rounded border-slate-300 p-2 text-sm" placeholder="+1 555..." value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
                                    </div>
                                    <div className="flex gap-2">
                                        <select className="w-full rounded border-slate-300 p-2 text-sm" value={newContact.type} onChange={e => setNewContact({...newContact, type: e.target.value as any})}>
                                            <option value="Site Medic">Site Medic</option>
                                            <option value="Fire Warden">Fire Warden</option>
                                            <option value="Management">Management</option>
                                        </select>
                                        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><CheckCircle size={18}/></button>
                                        <button type="button" onClick={() => setShowAddContact(false)} className="bg-slate-200 text-slate-600 p-2 rounded hover:bg-slate-300"><X size={18}/></button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="divide-y divide-slate-100">
                            {orgContacts.length === 0 ? (
                                <p className="p-6 text-center text-slate-400 text-sm">No organization contacts added yet.</p>
                            ) : (
                                orgContacts.map(contact => (
                                    <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                                {getContactIcon(contact.type)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{contact.name}</h4>
                                                <p className="text-sm text-slate-500">{contact.role}</p>
                                                {contact.location && (
                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                        <MapPin size={12} /> {contact.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a href={`tel:${contact.phone}`} className="bg-green-100 text-green-700 p-2.5 rounded-full hover:bg-green-200 transition-colors">
                                                <Phone size={18} />
                                            </a>
                                            <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MUSTER TAB */}
            {activeTab === 'muster' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Muster Point Check-In</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            In case of emergency evacuation, proceed to your designated Muster Point immediately and check in.
                        </p>

                        {!checkedIn ? (
                            <button 
                                onClick={handleMusterCheckIn}
                                disabled={isLocating}
                                className="w-full max-w-sm bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-lg font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-3"
                            >
                                {isLocating ? <Loader2 className="animate-spin" /> : <UserCheck size={24} />}
                                {isLocating ? "Locating..." : "I AM SAFE - CHECK IN"}
                            </button>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-sm mx-auto">
                                <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
                                <h4 className="text-xl font-bold text-green-800">Checked In Successfully</h4>
                                <p className="text-green-700 mt-2">Time: {new Date().toLocaleTimeString()}</p>
                                {userLocation && (
                                    <p className="text-xs text-green-600 mt-1 font-mono">
                                        Loc: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-4 items-start">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-yellow-800">Primary Muster Point</h4>
                            <p className="text-yellow-700 text-sm">Contact your site HSE manager for your designated muster point location.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* DRILLS TAB */}
            {activeTab === 'drills' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Emergency Drill Log</h3>
                            <button 
                                onClick={() => setShowDrillModal(true)}
                                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
                            >
                                Log New Drill
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {drills.map(drill => (
                                <div key={drill.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{drill.type}</h4>
                                            <p className="text-sm text-slate-500">{drill.location}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                            drill.outcome === 'Success' ? 'bg-green-100 text-green-700' : 
                                            drill.outcome === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {drill.outcome}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                        <span className="flex items-center gap-1"><History size={12}/> {new Date(drill.date).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Users size={12}/> {drill.participantsCount} participants</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {drill.durationMinutes} mins</span>
                                        {drill.attendanceFile && <span className="flex items-center gap-1 text-blue-600"><FileText size={12}/> Attachment</span>}
                                    </div>
                                    {drill.attendanceList && (
                                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                            <strong>Attendees:</strong> {drill.attendanceList.length > 5 ? `${drill.attendanceList.slice(0, 5).join(', ')} +${drill.attendanceList.length - 5} more` : drill.attendanceList.join(', ')}
                                        </div>
                                    )}
                                    {drill.notes && (
                                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                            "{drill.notes}"
                                        </p>
                                    )}
                                </div>
                            ))}
                            {drills.length === 0 && (
                                <div className="p-8 text-center text-slate-400">No drills recorded.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Log Drill Modal */}
            {showDrillModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Log Emergency Drill</h3>
                            <button onClick={() => setShowDrillModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDrill} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Drill Type</label>
                                <select 
                                    value={newDrill.type}
                                    onChange={(e) => setNewDrill({...newDrill, type: e.target.value as any})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="Fire Evacuation">Fire Evacuation</option>
                                    <option value="Medical Emergency">Medical Emergency</option>
                                    <option value="Chemical Spill">Chemical Spill</option>
                                    <option value="Confined Space Rescue">Confined Space Rescue</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input 
                                        type="date"
                                        required
                                        value={newDrill.date}
                                        onChange={(e) => setNewDrill({...newDrill, date: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (mins)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        required
                                        value={newDrill.durationMinutes}
                                        onChange={(e) => setNewDrill({...newDrill, durationMinutes: parseInt(e.target.value)})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <input 
                                    type="text"
                                    required
                                    value={newDrill.location}
                                    onChange={(e) => setNewDrill({...newDrill, location: e.target.value})}
                                    placeholder="e.g. Warehouse Zone B"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Participants</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        required
                                        value={newDrill.participantsCount}
                                        onChange={(e) => setNewDrill({...newDrill, participantsCount: parseInt(e.target.value)})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                        disabled={attendanceMode === 'digital' && attendanceNames.length > 0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                                    <select 
                                        value={newDrill.outcome}
                                        onChange={(e) => setNewDrill({...newDrill, outcome: e.target.value as any})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    >
                                        <option value="Success">Success</option>
                                        <option value="Partial Success">Partial Success</option>
                                        <option value="Failed">Failed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Attendance Section */}
                            <div className="border-t border-slate-200 pt-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">Attendance Record</label>
                                <div className="flex gap-2 mb-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setAttendanceMode('digital')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${attendanceMode === 'digital' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        <List size={14} /> Digital List
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setAttendanceMode('upload')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${attendanceMode === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        <Upload size={14} /> Upload Sheet
                                    </button>
                                </div>

                                {attendanceMode === 'digital' ? (
                                    <textarea 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-24"
                                        placeholder="Enter participant names (one per line)..."
                                        value={attendanceNames}
                                        onChange={(e) => setAttendanceNames(e.target.value)}
                                    />
                                ) : (
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 relative">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,.pdf" />
                                        {isUploading ? (
                                            <Loader2 size={24} className="mx-auto animate-spin text-blue-500" />
                                        ) : attendanceFile ? (
                                            <div className="text-green-600 flex flex-col items-center">
                                                <CheckCircle size={24} />
                                                <span className="text-xs mt-1 font-medium">File Attached</span>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400">
                                                <Upload size={24} className="mx-auto mb-1" />
                                                <span className="text-xs">Click to upload attendance sheet</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label>
                                <textarea 
                                    value={newDrill.notes}
                                    onChange={(e) => setNewDrill({...newDrill, notes: e.target.value})}
                                    placeholder="What went well? What needs improvement?"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-20 resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowDrillModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Drill Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
