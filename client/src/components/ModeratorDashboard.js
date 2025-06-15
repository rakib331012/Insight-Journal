import React, { useState, useEffect } from 'react';
import axios from 'axios';
import parse from 'html-react-parser';

const ModeratorDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/moderation/submissions');
        const data = response.data;
        setSubmissions(data.map(sub => ({
          ...sub,
          _id: sub._id.$oid || sub._id
        })));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch submissions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const handleAction = async (id, action, comment = '') => {
    try {
      await axios.post(`http://localhost:5001/api/moderation/${id}/${action}`, { comment });
      setSubmissions(submissions.filter(sub => sub._id !== id));
      alert(`Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Network error occurred');
    }
  };

  const openModal = (submission) => setSelectedSubmission(submission);
  const closeModal = () => setSelectedSubmission(null);

  if (loading) return <p className="text-center text-gray-600">Loading...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Moderator Dashboard</h2>
      {submissions.length === 0 ? (
        <p className="text-center text-gray-600">No pending submissions</p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((sub) => (
            <li key={sub._id} className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900">{sub.title}</h3>
              <p className="text-gray-600"><strong>Category:</strong> {sub.category}</p>
              <p className="text-gray-600"><strong>Tags:</strong> {sub.tags.join(', ') || 'N/A'}</p>
              <p className="text-gray-600"><strong>Author:</strong> {sub.authorName || 'Anonymous'}</p>
              <p className="text-gray-600"><strong>Email:</strong> {sub.authorEmail || 'Not provided'}</p>
              <p className="text-gray-700 line-clamp-2">{sub.content.substring(0, 100)}...</p>
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={() => openModal(sub)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleAction(sub._id, 'approve')}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                >
                  Approve
                </button>
                <input
                  type="text"
                  placeholder="Rejection comment"
                  className="border border-gray-300 rounded px-3 py-2 w-1/3"
                />
                <button
                  onClick={() => handleAction(sub._id, 'reject', prompt('Enter rejection comment') || '')}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedSubmission.title}</h3>
            <p className="text-gray-600 mb-2"><strong>Category:</strong> {selectedSubmission.category}</p>
            <p className="text-gray-600 mb-2"><strong>Tags:</strong> {selectedSubmission.tags.join(', ') || 'N/A'}</p>
            <p className="text-gray-600 mb-2"><strong>Author:</strong> {selectedSubmission.authorName || 'Anonymous'}</p>
            <p className="text-gray-600 mb-4"><strong>Email:</strong> {selectedSubmission.authorEmail || 'Not provided'}</p>
            {selectedSubmission.featuredImage && (
              <img
                src={selectedSubmission.featuredImage}
                alt={selectedSubmission.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <div className="prose max-w-none">{parse(selectedSubmission.content)}</div>
            <button
              onClick={closeModal}
              className="mt-6 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorDashboard;