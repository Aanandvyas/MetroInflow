import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const RoleManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: ''
  });
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      
      try {
        // Fetch all departments
        const { data, error } = await supabase
          .from('department')
          .select('d_uuid, d_name')
          .order('d_name', { ascending: true });
        
        if (error) throw error;
        
        setDepartments(data || []);
        
        // Select first department by default if available
        if (data && data.length > 0) {
          setSelectedDepartment(data[0]);
          fetchRoles(data[0].d_uuid);
        }
        
      } catch (error) {
        console.error('Error fetching departments:', error);
        showNotification('error', `Error fetching departments: ${error.message}`);
      } finally {
        setLoadingDepartments(false);
      }
    };
    
    fetchDepartments();
  }, []);

  // Fetch roles for the selected department
  const fetchRoles = async (departmentId) => {
    if (!departmentId) return;
    
    setLoadingRoles(true);
    
    try {
      const { data, error } = await supabase
        .from('role')
        .select('r_uuid, r_name, d_uuid')
        .eq('d_uuid', departmentId)
        .order('r_name', { ascending: true });
      
      if (error) throw error;
      
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification('error', `Error fetching roles: ${error.message}`);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Helper to show notifications
  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });
    
    // Auto-hide notification after a few seconds
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, type === 'error' ? 5000 : 3000);
  };

  // Handle department change
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    const dept = departments.find(d => d.d_uuid === deptId);
    setSelectedDepartment(dept);
    fetchRoles(deptId);
  };

  // Handle form change for role
  const handleRoleFormChange = (e) => {
    const { name, value } = e.target;
    setRoleForm({
      ...roleForm,
      [name]: value
    });
  };

  // Open add role modal
  const handleAddRoleClick = () => {
    setRoleForm({
      name: ''
    });
    setShowAddRoleModal(true);
  };

  // Open edit role modal
  const handleEditRoleClick = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.r_name || ''
    });
    setShowEditRoleModal(true);
  };

  // Open delete role confirmation
  const handleDeleteRoleClick = (role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  // Add role submission
  const handleAddRoleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!roleForm.name.trim()) {
        throw new Error('Role name is required');
      }
      
      if (!selectedDepartment) {
        throw new Error('Please select a department');
      }
      
      // Add role to database
      const { data, error } = await supabase
        .from('role')
        .insert([
          {
            r_name: roleForm.name.trim(),
            d_uuid: selectedDepartment.d_uuid
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update local state
      setRoles([...roles, data[0]]);
      
      // Show success notification
      showNotification('success', 'Role added successfully!');
      
      // Close modal
      setShowAddRoleModal(false);
    } catch (error) {
      console.error('Error adding role:', error);
      showNotification('error', `Error adding role: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit role submission
  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!roleForm.name.trim()) {
        throw new Error('Role name is required');
      }
      
      // Update role in database
      const { error } = await supabase
        .from('role')
        .update({
          r_name: roleForm.name.trim()
        })
        .eq('r_uuid', editingRole.r_uuid);
      
      if (error) throw error;
      
      // Update local state
      setRoles(roles.map(role => 
        role.r_uuid === editingRole.r_uuid 
          ? { 
              ...role, 
              r_name: roleForm.name.trim()
            } 
          : role
      ));
      
      // Show success notification
      showNotification('success', 'Role updated successfully!');
      
      // Close modal
      setShowEditRoleModal(false);
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('error', `Error updating role: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete role confirmation
  const handleConfirmDeleteRole = async () => {
    setIsSubmitting(true);
    
    try {
      // Delete role from database
      const { error } = await supabase
        .from('role')
        .delete()
        .eq('r_uuid', roleToDelete.r_uuid);
      
      if (error) throw error;
      
      // Update local state
      setRoles(roles.filter(role => role.r_uuid !== roleToDelete.r_uuid));
      
      // Show success notification
      showNotification('success', 'Role deleted successfully!');
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('error', `Error deleting role: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loadingDepartments) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with department selector and add button */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Role Management</h3>
            <div className="flex items-center">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mr-2">
                Department:
              </label>
              <select
                id="department"
                value={selectedDepartment?.d_uuid || ''}
                onChange={handleDepartmentChange}
                className="block w-full md:w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {departments.length === 0 ? (
                  <option value="">No departments available</option>
                ) : (
                  departments.map((dept) => (
                    <option key={dept.d_uuid} value={dept.d_uuid}>
                      {dept.d_name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <button
            onClick={handleAddRoleClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 mt-7 md:mt-9"
            disabled={!selectedDepartment}
          >
            Add Role
          </button>
        </div>
      </div>
      
      {/* Role List */}
      {loadingRoles ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                    No roles found for this department
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.r_uuid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.r_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => handleEditRoleClick(role)}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteRoleClick(role)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Role</h3>
              <button 
                onClick={() => setShowAddRoleModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={roleForm.name}
                  onChange={handleRoleFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={roleForm.description}
                  onChange={handleRoleFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-75"
                >
                  {isSubmitting ? 'Adding...' : 'Add Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Role Modal */}
      {showEditRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Role</h3>
              <button 
                onClick={() => setShowEditRoleModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={roleForm.name}
                  onChange={handleRoleFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={roleForm.description}
                  onChange={handleRoleFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-75"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete role <span className="font-medium">{roleToDelete?.r_name}</span>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-75"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-md shadow-md z-50 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;