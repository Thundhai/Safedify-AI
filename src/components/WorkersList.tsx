import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkers, deleteWorker } from '../services/storageService';
import { WorkerProfile } from '../types';
import { 
  Users, Plus, Search, Edit, Trash2, Award, Calendar, Building, 
  CheckCircle, AlertTriangle, User, Filter, MoreVertical
} from 'lucide-react';
import { EmptyState } from './EmptyState';

export const WorkersList: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setWorkers(await getWorkers());
    setLoading(false);
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      await deleteWorker(id);
      loadWorkers();
    }
  };

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterBy === 'all') return true;
    if (filterBy === 'direct') return !worker.companyId;
    if (filterBy === 'contractor') return !!worker.companyId;
    
    return true;
  });

  const getPointsColor = (points: number = 0) => {
    if (points >= 150) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (points >= 100) return 'text-green-600 bg-green-50 border-green-200';
    if (points >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getLevelBadge = (level: string) => {
    const levelColors: Record<string, string> = {
      'Safety Legend': 'bg-yellow-500 text-white',
      'Safety Champ': 'bg-green-500 text-white',
      'Safety Pro': 'bg-blue-500 text-white',
      'Novice': 'bg-gray-400 text-white'
    };
    
    return levelColors[level] || 'bg-gray-400 text-white';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (workers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Team Members</h2>
            <p className="text-slate-500">Manage your workers, contractors, and safety team.</p>
          </div>
          <Link
            to="/workers/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Worker
          </Link>
        </div>

        <EmptyState
          type="workers"
          title="No Team Members Added Yet"
          description="Start building your safety team by adding workers, contractors, and supervisors. Track their training, certifications, and safety performance."
          actionText="Add First Worker"
          actionHref="/workers/new"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Members</h2>
          <p className="text-slate-500">Manage your workers, contractors, and safety team.</p>
        </div>
        <Link
          to="/workers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Workers</p>
              <p className="text-2xl font-bold text-slate-800">{workers.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Direct Employees</p>
              <p className="text-2xl font-bold text-slate-800">
                {workers.filter(w => !w.companyId).length}
              </p>
            </div>
            <Building className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Contractors</p>
              <p className="text-2xl font-bold text-slate-800">
                {workers.filter(w => w.companyId).length}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Safety Champions</p>
              <p className="text-2xl font-bold text-slate-800">
                {workers.filter(w => (w.points || 0) >= 150).length}
              </p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search workers by name, role, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Filter className="w-4 h-4" />
              {filterBy === 'all' ? 'All Workers' : 
               filterBy === 'direct' ? 'Direct Employees' : 'Contractors'}
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => { setFilterBy('all'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 ${filterBy === 'all' ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  All Workers
                </button>
                <button
                  onClick={() => { setFilterBy('direct'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 ${filterBy === 'direct' ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  Direct Employees
                </button>
                <button
                  onClick={() => { setFilterBy('contractor'); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 ${filterBy === 'contractor' ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  Contractors
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workers List */}
        <div className="divide-y divide-slate-200">
          {filteredWorkers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No workers match your search criteria.
            </div>
          ) : (
            filteredWorkers.map((worker) => (
              <div key={worker.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {worker.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-slate-800">{worker.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{worker.role}</span>
                        <span>•</span>
                        <span>{worker.department}</span>
                        {worker.companyId && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">Contractor</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          Joined {new Date(worker.joinedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Safety Level Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadge(worker.level)}`}>
                      {worker.level}
                    </div>
                    
                    {/* Points */}
                    <div className={`px-2 py-1 rounded border text-xs font-medium ${getPointsColor(worker.points)}`}>
                      {worker.points || 0} pts
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/workers/${worker.id}/edit`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Worker"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      
                      <Link
                        to={`/training/worker/${worker.id}`}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="View Training"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteWorker(worker.id, worker.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Worker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                {worker.badges && worker.badges.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 ml-16">
                    <span className="text-xs text-slate-500">Badges:</span>
                    {worker.badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};