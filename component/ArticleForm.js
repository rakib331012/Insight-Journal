import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function ArticleForm({ onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    authorName: '',
    authorEmail: '',
    featuredImage: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const categories = [
    { value: '', label: 'Select Category' },
    { value: 'science', label: 'Science' },
    { value: 'technology', label: 'Technology' },
    { value: 'history', label: 'History' },
    { value: 'literature', label: 'Literature' },
    { value: 'philosophy', label: 'Philosophy' },
    { value: 'arts', label: 'Arts' },
    { value: 'politics', label: 'Politics' },
    { value: 'economics', label: 'Economics' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitStatus({ type: 'error', message: 'Image size must be less than 5MB' });
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setSubmitStatus({ type: 'error', message: 'Only JPEG and PNG images are allowed' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          featuredImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContentChange = (value) => {
    // Strip HTML tags to count plain text length
    const plainText = value.replace(/<[^>]+>/g, '');
    if (plainText.length > 10000) {
      setSubmitStatus({ type: 'error', message: 'Content exceeds 10,000 characters. Please shorten your article.' });
      return;
    }
    setFormData(prev => ({ ...prev, content: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const plainText = formData.content.replace(/<[^>]+>/g, '');
    if (plainText.length < 100) {
      setSubmitStatus({ type: 'error', message: 'Article content must be at least 100 characters.' });
      setIsSubmitting(false);
      return;
    }

    if (!formData.title || !formData.content || !formData.category || !formData.authorName || !formData.authorEmail) {
      setSubmitStatus({ type: 'error', message: 'All required fields must be filled.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/articles/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          authorName: formData.authorName,
          authorEmail: formData.authorEmail,
          featuredImage: formData.featuredImage
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: 'Article submitted successfully! It will be reviewed by our moderators.' });
        setFormData({ title: '', content: '', category: '', tags: '', authorName: '', authorEmail: '', featuredImage: null });
        setTimeout(onClose, 2000);
      } else {
        setSubmitStatus({ type: 'error', message: data.message || 'Submission failed. Please try again.' });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSubmitStatus({ type: 'error', message: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleOverlayClick}>
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Submit New Article</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>×</button>
        </div>

        {submitStatus && (
          <div className={`p-4 mb-4 rounded ${submitStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {submitStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="authorName" className="block text-sm font-medium text-gray-700">Your Name *</label>
            <input
              type="text"
              id="authorName"
              name="authorName"
              value={formData.authorName}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
              required
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="authorEmail" className="block text-sm font-medium text-gray-700">Email Address *</label>
            <input
              type="email"
              id="authorEmail"
              name="authorEmail"
              value={formData.authorEmail}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
              required
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Article Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
              required
              placeholder="Enter a compelling title"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
              placeholder="Enter tags separated by commas (e.g., AI, machine learning)"
            />
            <p className="text-gray-500 text-sm mt-1">Tags help readers discover your article.</p>
          </div>

          <div>
            <label htmlFor="featuredImage" className="block text-sm font-medium text-gray-700">Featured Image</label>
            <input
              type="file"
              id="featuredImage"
              name="featuredImage"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
            />
            <p className="text-gray-500 text-sm mt-1">Upload a featured image for your article (optional, max 5MB, JPEG/PNG).</p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Article Content *</label>
            <ReactQuill
              value={formData.content}
              onChange={handleContentChange}
              className="mt-1 border-gray-300 rounded-md"
              placeholder="Write your article content here..."
              modules={{
                toolbar: [
                  [{ header: [1, 2, false] }],
                  ['bold', 'italic', 'underline'],
                  ['link', 'image'],
                  ['clean']
                ]
              }}
            />
            <p className="text-gray-500 text-sm mt-1">Minimum 100 characters, maximum 10,000 characters.</p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Article'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-2">Submission Guidelines:</h4>
            <ul className="text-gray-600 text-sm list-disc pl-5">
              <li>All articles are subject to moderation.</li>
              <li>Content must be original and well-researched.</li>
              <li>Minimum 100 characters, maximum 10,000 characters.</li>
              <li>Email notifications will be sent for status updates.</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ArticleForm;