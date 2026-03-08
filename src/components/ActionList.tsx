import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Calendar, User, Link as LinkIcon, Trash2 } from 'lucide-react';
import { getActions, getIncidents, saveAction, deleteAction } from '../services/storageService';
import { Incident, ActionItem } from '../types';
import { Pagination } from './Pagination';
import toast from 'react-hot-toast';

export const ActionList: React.FC = () => {
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        assignee: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        relatedIncidentId: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setActions(await getActions());
            setIncidents(await getIncidents());
            setLoading(false);
        };
        load();
    }, []);

    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(actions.length / PAGE_SIZE);
    const paginatedActions = actions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete action "${title}"? This cannot be undone.`)) return;
        await deleteAction(id);
        setActions(prev => prev.filter(a => a.id !== id));
        toast.success('Action deleted');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const action: ActionItem = {
            id: `act-${Date.now()}`,
            title: newItem.title,
            assignee: newItem.assignee,
            dueDate: newItem.dueDate,
            priority: newItem.priority as any,
            status: 'Open',
            actionType: 'Corrective',
            category: 'Other',
            indicator: 'Lagging',
            relatedIncidentId: newItem.relatedIncidentId || undefined
        };
        await saveAction(action);
        setActions(prev => [action, ...prev]);
        setShowModal(false);
        setNewItem({
            title: '', assignee: '', priority: 'Medium',
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            relatedIncidentId: ''
        });
    };

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Action Items</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shadow-sm flex items-center gap-2"
                >
                    <Plus size={18} /> New Action
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedActions.map(action => {
                        const linkedIncident = incidents.find(i => i.id === action.relatedIncidentId);
                        return (
                            <div key={action.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-800 dark:text-slate-100">{action.title}</p>
                                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                                            action.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                            action.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {action.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1"><User size={12}/> {action.assignee}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12}/> Due: {action.dueDate}</span>
                                        {linkedIncident && (
                                            <Link to={`/incidents/${linkedIncident.id}`} className="flex items-center gap-1 text-brand-orange hover:underline bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full text-xs">
                                                <LinkIcon size={10} /> Ref: Incident #{linkedIncident.id.split('-')[1]}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                    <button
                                        onClick={() => handleDelete(action.id, action.title)}
                                        className="p-1.5 text-slate-300 hover:text-red-600 transition-colors rounded"
                                        title="Delete action"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                        action.status === 'Done' ? 'bg-green-100 text-green-700' :
                                        action.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {action.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {actions.length === 0 && <p className="p-6 text-center text-slate-400">No actions found.</p>}
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={actions.length}
                pageSize={PAGE_SIZE}
            />

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create Action Item</h3>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close modal"
                                title="Close action item modal"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                    value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="What needs to be done?" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                        value={newItem.assignee} onChange={e => setNewItem({...newItem, assignee: e.target.value})} placeholder="Name" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                                    <input 
                                        required 
                                        type="date" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none"
                                        aria-label="Due date for action item"
                                        title="Select due date"
                                        value={newItem.dueDate} onChange={e => setNewItem({...newItem, dueDate: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-navy text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg mt-2">Create Action</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
