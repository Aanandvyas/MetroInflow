import React, { useState, useEffect } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';
import { supabaseAdmin } from '../../supabaseAdmin';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    r_uuid: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [departmentRoles, setDepartmentRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Fetch users list
  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("users")
      .select(`
        uuid, 
        name, 
        email, 
        phone_number, 
        department(d_name, d_uuid),
        role(r_name, r_uuid),
        position,
        address
      `);
    
    if (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } else {
      setUsers(data || []);
    }
    setLoadingUsers(false);
  };
  
  // Fetch roles for a department
  const fetchRolesForDepartment = async (departmentUuid) => {
    if (!departmentUuid) {
      setDepartmentRoles([]);
      return;
    }
    
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from("role")
        .select("r_uuid, r_name")
        .eq("d_uuid", departmentUuid)
        .order("r_name", { ascending: true });
      
      if (error) throw error;
      
      setDepartmentRoles(data || []);
    } catch (error) {
      console.error("Error loading roles:", error);
      setDepartmentRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };
  
  // Handle edit button click
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      address: user.address || '',
      r_uuid: user.role?.r_uuid || '',
    });
    
    // Fetch roles for this user's department
    if (user.department?.d_uuid) {
      fetchRolesForDepartment(user.department.d_uuid);
    }
    
    setShowEditModal(true);
  };
  
  // Handle edit form change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };
  
  // Handle edit form submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Update the user in the database
      const { error } = await supabase
        .from('users')
        .update({
          name: editFormData.name,
          phone_number: editFormData.phone_number,
          address: editFormData.address,
          r_uuid: editFormData.r_uuid || null,
        })
        .eq('uuid', editingUser.uuid);
      
      if (error) throw error;
      
      // Get the updated role name for display
      let updatedRoleName = '';
      if (editFormData.r_uuid) {
        const selectedRole = departmentRoles.find(role => role.r_uuid === editFormData.r_uuid);
        updatedRoleName = selectedRole ? selectedRole.r_name : '';
      }
      
      // Update local state to reflect changes
      setUsers(users.map(user => 
        user.uuid === editingUser.uuid 
          ? { 
              ...user, 
              name: editFormData.name,
              phone_number: editFormData.phone_number,
              address: editFormData.address,
              role: editFormData.r_uuid ? { 
                r_uuid: editFormData.r_uuid,
                r_name: updatedRoleName
              } : user.role
            } 
          : user
      ));
      
      setNotification({
        show: true,
        type: 'success',
        message: 'User updated successfully!'
      });
      
      // Close the modal
      setShowEditModal(false);
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, type: '', message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error updating user:', error);
      setNotification({
        show: true,
        type: 'error',
        message: `Error updating user: ${error.message}`
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, type: '', message: '' });
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    
    try {
      let authError = null;
      
      console.log('Starting user deletion for UUID:', userToDelete.uuid);
      console.log('User email:', userToDelete.email);
      
      // First, try to delete the user from Supabase Auth
      if (supabaseAdmin) {
        console.log('Checking if user exists in Supabase Auth...');
        
        // First, try to get the user to see if it exists
        const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
          userToDelete.uuid
        );
        
        if (getUserError) {
          console.log('User not found in auth or error getting user:', getUserError);
          // User might not exist in auth, or might be using email as identifier
          
          // Try to list users by email to find the correct auth user
          const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (!listError && userList?.users) {
            const authUserByEmail = userList.users.find(u => u.email === userToDelete.email);
            if (authUserByEmail) {
              console.log('Found user in auth by email:', authUserByEmail.id);
              // Delete using the auth user's ID
              const result = await supabaseAdmin.auth.admin.deleteUser(authUserByEmail.id);
              authError = result.error;
            } else {
              console.log('User not found in Supabase Auth by email either');
              authError = new Error('User not found in authentication system');
            }
          } else {
            authError = getUserError;
          }
        } else {
          console.log('User found in auth, proceeding with deletion...');
          // User exists, proceed with deletion using the UUID
          const result = await supabaseAdmin.auth.admin.deleteUser(userToDelete.uuid);
          authError = result.error;
        }
        
        if (authError) {
          console.error('Error deleting user from auth:', authError);
        } else {
          console.log('Successfully deleted user from Supabase Auth');
        }
      } else {
        console.warn('Supabase admin client not available, skipping auth deletion');
        authError = new Error('Admin client not initialized');
      }
      
      // Delete the user from the database
      console.log('Attempting to delete from database...');
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('uuid', userToDelete.uuid);
      
      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      } else {
        console.log('Successfully deleted user from database');
      }
      
      // Update local state to remove the deleted user
      setUsers(users.filter(user => user.uuid !== userToDelete.uuid));
      
      setNotification({
        show: true,
        type: 'success',
        message: authError 
          ? 'User deleted from database (auth deletion failed - may require manual cleanup)'
          : 'User deleted successfully from both database and authentication!'
      });
      
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, type: '', message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error deleting user:', error);
      setNotification({
        show: true,
        type: 'error',
        message: `Error deleting user: ${error.message}`
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, type: '', message: '' });
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Filtered users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.d_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
          <div className="mt-3 md:mt-0">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>
      
      {loadingUsers ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchTerm ? "No users matching your search" : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uuid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.phone_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department?.d_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.position === 'head' 
                        ? `Head of ${user.department?.d_name || 'Department'}`
                        : (user.role?.r_name || 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.position === 'head' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Head
                        </span>
                      ) : user.position === 'admin' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => handleEditClick(user)}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteClick(user)}
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
      
      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  disabled
                  value={editFormData.email}
                  className="w-full px-3 py-2 mt-1 border rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={editFormData.phone_number}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              
              {editingUser?.department?.d_uuid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="r_uuid"
                    value={editFormData.r_uuid}
                    onChange={handleEditFormChange}
                    className={`w-full px-3 py-2 mt-1 border rounded-md ${
                      loadingRoles ? "bg-gray-50" : ""
                    }`}
                    disabled={loadingRoles || editingUser?.position === 'head'}
                  >
                    <option value="">
                      {loadingRoles
                        ? "Loading roles..."
                        : editingUser?.position === 'head'
                        ? "Department Head"
                        : "No Role (Regular User)"}
                    </option>
                    {!editingUser?.position || editingUser?.position !== 'head' ? (
                      departmentRoles.map((role) => (
                        <option key={role.r_uuid} value={role.r_uuid}>
                          {role.r_name}
                        </option>
                      ))
                    ) : null}
                  </select>
                  {editingUser?.position === 'head' && (
                    <p className="text-xs text-gray-500 mt-1">Department heads cannot change roles</p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="address"
                  rows="3"
                  value={editFormData.address}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                Are you sure you want to delete user <span className="font-medium">{userToDelete?.name}</span>? This action cannot be undone.
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
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-75"
              >
                {isSubmitting ? 'Deleting...' : 'Delete User'}
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

export default UserManagement;