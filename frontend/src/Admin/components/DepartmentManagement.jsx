import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabaseClient';

const DepartmentManagement = () => {
  const supabase = getSupabase();
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: ''
  });
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Fetch departments
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch department list
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    
    try {
      const { data, error } = await supabase
        .from("department")
        .select(`
          d_uuid,
          d_name
        `)
        .order('d_name', { ascending: true });
      
      if (error) throw error;
      
      setDepartments(data || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      showNotification('error', `Error loading departments: ${error.message}`);
    } finally {
      setLoadingDepartments(false);
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

  // Handle form change for department
  const handleDeptFormChange = (e) => {
    const { name, value } = e.target;
    setDepartmentForm({
      ...departmentForm,
      [name]: value
    });
  };

  // Open add department modal
  const handleAddDeptClick = () => {
    setDepartmentForm({
      name: ''
    });
    setShowAddDeptModal(true);
  };

  // Open edit department modal
  const handleEditDeptClick = (dept) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.d_name || ''
    });
    setShowEditDeptModal(true);
  };

  // Open delete department confirmation
  const handleDeleteDeptClick = (dept) => {
    setDeptToDelete(dept);
    setShowDeleteConfirm(true);
  };

  // Add department submission
  const handleAddDeptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!departmentForm.name.trim()) {
        throw new Error('Department name is required');
      }
      
      // Add department to database
      const { data, error } = await supabase
        .from('department')
        .insert([
          {
            d_name: departmentForm.name.trim()
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update local state
      setDepartments([...departments, data[0]]);
      
      // Show success notification
      showNotification('success', 'Department added successfully!');
      
      // Close modal
      setShowAddDeptModal(false);
    } catch (error) {
      console.error('Error adding department:', error);
      showNotification('error', `Error adding department: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit department submission
  const handleEditDeptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!departmentForm.name.trim()) {
        throw new Error('Department name is required');
      }
      
      // Update department in database
      const { error } = await supabase
        .from('department')
        .update({
          d_name: departmentForm.name.trim()
        })
        .eq('d_uuid', editingDepartment.d_uuid);
      
      if (error) throw error;
      
      // Update local state
      setDepartments(departments.map(dept => 
        dept.d_uuid === editingDepartment.d_uuid 
          ? { 
              ...dept, 
              d_name: departmentForm.name.trim()
            } 
          : dept
      ));
      
      // Show success notification
      showNotification('success', 'Department updated successfully!');
      
      // Close modal
      setShowEditDeptModal(false);
    } catch (error) {
      console.error('Error updating department:', error);
      showNotification('error', `Error updating department: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete department confirmation
  const handleConfirmDeleteDept = async () => {
    setIsSubmitting(true);
    
    try {
      // Delete department from database
      const { error } = await supabase
        .from('department')
        .delete()
        .eq('d_uuid', deptToDelete.d_uuid);
      
      if (error) throw error;
      
      // Update local state
      setDepartments(departments.filter(dept => dept.d_uuid !== deptToDelete.d_uuid));
      
      // Show success notification
      showNotification('success', 'Department deleted successfully!');
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting department:', error);
      showNotification('error', `Error deleting department: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with add button */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Department Management</h3>
          <button
            onClick={handleAddDeptClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Department
          </button>
        </div>
      </div>
      
      {/* Department List */}
      {loadingDepartments ? (
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
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                    No departments found
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.d_uuid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{dept.d_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => handleEditDeptClick(dept)}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteDeptClick(dept)}
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
      
      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Department</h3>
              <button 
                onClick={() => setShowAddDeptModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={departmentForm.name}
                  onChange={handleDeptFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={departmentForm.description}
                  onChange={handleDeptFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-75"
                >
                  {isSubmitting ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Department Modal */}
      {showEditDeptModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Department</h3>
              <button 
                onClick={() => setShowEditDeptModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={departmentForm.name}
                  onChange={handleDeptFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={departmentForm.description}
                  onChange={handleDeptFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDeptModal(false)}
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
                Are you sure you want to delete department <span className="font-medium">{deptToDelete?.d_name}</span>? This will also delete all roles associated with this department.
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
                onClick={handleConfirmDeleteDept}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-75"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Department'}
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

export default DepartmentManagement;