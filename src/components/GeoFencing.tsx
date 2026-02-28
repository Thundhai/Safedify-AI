
import React, { useState, useEffect } from 'react';
import { getSafetyZones, saveSafetyZone, deleteSafetyZone } from '../services/storageService';
import { SafetyZone } from '../types';
import { MapPin, Plus, Trash2, ShieldAlert, Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';

export const GeoFencing: React.FC = () => {
    const [zones, setZones] = useState<SafetyZone[]>([]);
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [activeZone, setActiveZone] = useState<SafetyZone | null>(null);
    
    // Form State
    const [showForm, setShowForm] = useState(false);
    const [newZone, setNewZone] = useState<Partial<SafetyZone>>({
        name: '', type: 'Danger', radius: 50, requiredPPE: [], lat: 34.0522, lng: -118.2437
    });

    useEffect(() => {
        const load = async () => {
            setZones(await getSafetyZones());
        };
        load();
    }, []);

    const handleLocateUser = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    checkZones(loc);
                    setIsLocating(false);
                },
                (err) => {
                    console.error("Geo error", err.message);
                    setIsLocating(false);
                    let msg = "Location access denied.";
                    switch(err.code) {
                        case err.PERMISSION_DENIED: msg = "Location permission denied. Please allow in settings."; break;
                        case err.POSITION_UNAVAILABLE: msg = "Location signal unavailable."; break;
                        case err.TIMEOUT: msg = "Location request timed out."; break;
                    }
                    alert(msg);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            alert("Geolocation not supported by this browser.");
            setIsLocating(false);
        }
    };

    // Haversine formula for distance
    const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2-lat1);  
        var dLon = deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return d * 1000; // meters
    }

    const deg2rad = (deg: number) => deg * (Math.PI/180);

    const checkZones = (loc: {lat: number, lng: number}) => {
        const found = zones.find(z => getDistanceFromLatLonInM(loc.lat, loc.lng, z.lat, z.lng) <= z.radius);
        setActiveZone(found || null);
    };

    const handleAddZone = async (e: React.FormEvent) => {
        e.preventDefault();
        const zone: SafetyZone = {
            id: `zone-${Date.now()}`,
            name: newZone.name!,
            type: newZone.type as any,
            lat: newZone.lat!,
            lng: newZone.lng!,
            radius: newZone.radius!,
            requiredPPE: newZone.requiredPPE || []
        };
        await saveSafetyZone(zone);
        setZones(prev => [...prev, zone]);
        setShowForm(false);
    };

    const handleDeleteZone = async (id: string) => {
        if(confirm("Delete this zone?")) {
            await deleteSafetyZone(id);
            setZones(prev => prev.filter(z => z.id !== id));
        }
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'Danger': return 'bg-red-100 text-red-700';
            case 'Restricted': return 'bg-orange-100 text-orange-700';
            case 'Safe': return 'bg-green-100 text-green-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Geo-fenced Safety Zones</h2>
                    <p className="text-slate-500">Manage site boundaries and high-risk areas.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Create Zone
                </button>
            </div>

            {/* Status Panel */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        <Navigation size={20} className="text-blue-400" /> Current Status
                    </h3>
                    {userLocation ? (
                        <p className="text-slate-400 text-sm font-mono">
                            Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}
                        </p>
                    ) : (
                        <p className="text-slate-400 text-sm">Location not detected.</p>
                    )}
                </div>

                <div className="flex-1 w-full md:w-auto bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    {activeZone ? (
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Inside Zone</p>
                            <p className="text-xl font-bold text-red-400 animate-pulse">{activeZone.name}</p>
                            <p className="text-sm text-slate-300 mt-2">Required: {activeZone.requiredPPE.join(', ') || 'Standard PPE'}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Zone Status</p>
                            <p className="text-xl font-bold text-green-400">Safe / Unrestricted</p>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleLocateUser}
                    disabled={isLocating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
                >
                    {isLocating ? <Loader2 className="animate-spin" /> : <MapPin />}
                    Check My Location
                </button>
            </div>

            {/* Add Zone Form */}
            {showForm && (
                <form onSubmit={handleAddZone} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-slate-800 mb-4">Define New Safety Zone</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Zone Name</label>
                            <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} placeholder="e.g. Chemical Store" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                            <select className="w-full border border-slate-300 rounded p-2 text-sm" 
                                value={newZone.type} onChange={e => setNewZone({...newZone, type: e.target.value as any})}>
                                <option value="Danger">Danger Zone</option>
                                <option value="Restricted">Restricted Access</option>
                                <option value="Permit Required">Permit Required</option>
                                <option value="Safe">Safe Zone (Muster)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Latitude</label>
                            <input required type="number" step="any" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                value={newZone.lat} onChange={e => setNewZone({...newZone, lat: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Longitude</label>
                            <input required type="number" step="any" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                value={newZone.lng} onChange={e => setNewZone({...newZone, lng: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Radius (meters)</label>
                            <input required type="number" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                value={newZone.radius} onChange={e => setNewZone({...newZone, radius: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Zone</button>
                    </div>
                </form>
            )}

            {/* Zone List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Zone Name</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Coordinates</th>
                            <th className="px-6 py-3">Radius</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {zones.map(zone => (
                            <tr key={zone.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{zone.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getTypeColor(zone.type)}`}>
                                        {zone.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{zone.radius}m</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDeleteZone(zone.id)} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {zones.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">No zones configured.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
