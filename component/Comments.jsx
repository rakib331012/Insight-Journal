import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Comments = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/comments/${articleId}`)
      .then(res => setComments(res.data))
      .catch(err => console.error('Error fetching comments:', err));
  }, [articleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/comments', {
        article_id: articleId,
        content,
        user_id: 'anonymous'
      });
      alert('Comment submitted for moderation');
      setContent('');
    } catch (err) {
      console.error('Comment submission error:', err);
      alert('Comment submission failed');
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-semibold mb-4">Comments</h3>
      <form onSubmit={handleSubmit} className="glass-card p-6 mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add your comment..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 mb-4 resize-none h-32"
          required
        />
        <button type="submit" className="btn-primary">Submit Comment</button>
      </form>
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="glass-card p-4 flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {comment.user_id[0].toUpperCase()}
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300">{comment.content}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">By {comment.user_id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;