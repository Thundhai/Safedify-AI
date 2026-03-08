
import React, { useState, useEffect } from 'react';
import { getRoles, saveRole, deleteRole } from '../services/storageService';
import { Role, Permission, UserRoles } from '../types';
import { Plus, Trash2, Shield, Check, X, Edit2, Users } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { SubscriptionTier } from '../types';
import toast from 'react-hot-toast';

export const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Partial<Role>>({
        name: '',
        description: '',
        permissions: []
    });

    const allPermissions: { key: Permission, label: string }[] = [
        { key: 'manage_roles', label: 'Manage Roles & Permissions' },
        { key: 'manage_users', label: 'Manage Users & Org' },
        { key: 'view_analytics', label: 'View Analytics Dashboard' },
        { key: 'create_incident', label: 'Create Incident Reports' },
        { key: 'manage_incidents', label: 'Edit/Close Incidents' },
        { key: 'perform_inspection', label: 'Perform Inspections' },
        { key: 'create_permit', label: 'Request Permits' },
        { key: 'approve_permit', label: 'Approve Permits' },
        { key: 'manage_documents', label: 'Manage Documents' },
        { key: 'ai_features', label: 'Use AI Tools' },
    ];

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setRoles(await getRoles());
    };

    const handleCreateNew = () => {
        setEditingRole({
            id: undefined,
            name: '',
            description: '',
            permissions: [],
            isSystem: false
        });
        setShowModal(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole({ ...role });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this role? Users assigned to this role may lose access.")) {
            await deleteRole(id);
            await loadRoles();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole.name) return toast.error("Role name is required");

        const role: Role = {
            id: editingRole.id || `role-${Date.now()}`,
            name: editingRole.name,
            description: editingRole.description || '',
            permissions: editingRole.permissions || [],
            isSystem: editingRole.isSystem || false
        };

        await saveRole(role);
        setShowModal(false);
        await loadRoles();
    };

    const togglePermission = (key: Permission) => {
        const current = editingRole.permissions || [];
        if (current.includes(key)) {
            setEditingRole({ ...editingRole, permissions: current.filter(p => p !== key) });
        } else {
            setEditingRole({ ...editingRole, permissions: [...current, key] });
        }
    };

    return (
        <FeatureGate requiredTier={SubscriptionTier.ENTERPRISE} fullPage featureName="Custom Role Management">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Role Management</h2>
                        <p className="text-slate-500">Define custom roles and assign granular permissions.</p>
                    </div>
                    <button 
                        onClick={handleCreateNew}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
                    >
                        <Plus size={18} /> Create Custom Role
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {role.name === UserRoles.ADMIN ? <Shield size={24}/> : <Users size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{role.name}</h3>
                                        <p className="text-xs text-slate-500">{role.isSystem ? 'System Default' : 'Custom Role'}</p>
                                    </div>
                                </div>
                                {!role.isSystem ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(role)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(role.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEdit(role)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Permissions">
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>
                            
                            <p className="text-sm text-slate-600 mb-4 h-10 line-clamp-2">{role.description}</p>
                            
                            <div className="mt-auto">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Permissions ({role.permissions.length})</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {role.permissions.slice(0, 5).map(p => (
                                        <span key={p} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] rounded-md">
                                            {p.replace('_', ' ')}
                                        </span>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] rounded-md">
                                            +{role.permissions.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Role Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {editingRole.id ? (editingRole.isSystem ? 'View System Role' : 'Edit Role') : 'Create New Role'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Role Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            disabled={editingRole.isSystem}
                                            value={editingRole.name}
                                            onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                                            placeholder="e.g. Project Manager"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                        <input 
                                            type="text" 
                                            disabled={editingRole.isSystem}
                                            value={editingRole.description}
                                            onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                                            placeholder="Description of role responsibilities"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Permissions & Privileges</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        {allPermissions.map((perm) => {
                                            const isChecked = editingRole.permissions?.includes(perm.key);
                                            return (
                                                <label 
                                                    key={perm.key} 
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                        editingRole.isSystem ? 'cursor-not-allowed opacity-80' : 'hover:border-blue-300'
                                                    } ${isChecked ? 'bg-white border-blue-500 shadow-sm' : 'bg-transparent border-transparent'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {isChecked && <Check size={14} />}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden" 
                                                        disabled={editingRole.isSystem}
                                                        checked={isChecked}
                                                        onChange={() => togglePermission(perm.key)} 
                                                    />
                                                    <span className={`text-sm ${isChecked ? 'font-bold text-blue-900' : 'text-slate-600'}`}>
                                                        {perm.label}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                    {!editingRole.isSystem && (
                                        <button 
                                            type="submit"
                                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                                        >
                                            Save Role
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
};
