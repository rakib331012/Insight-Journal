// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ArticleForm from './components/ArticleForm';

function App() {
  const [articles, setArticles] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/api/articles')
      .then(res => setArticles(res.data))
      .catch(err => console.error('Error fetching articles:', err));
  }, []);

  return (
    <div className="App min-h-screen">
      <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h2 className="text-2xl font-bold text-green-400">The Insight Journal</h2>
          <div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mr-4"
            >
              Submit Article
            </button>
            <a href="/moderation" className="text-white hover:text-green-300">Moderation</a>
            <a href="/analytics" className="text-white hover:text-green-300 ml-4">Analytics</a>
          </div>
        </div>
      </nav>

      <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to Insight Journal</h1>
        <p className="text-xl mb-6">Explore thought-provoking articles from around the world.</p>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Contribute Your Story
        </button>
      </header>

      <main className="container mx-auto py-10">
        <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">Featured Articles</h2>
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <div key={index} className="card">
                <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                <p className="text-gray-600 mb-4">{article.category}</p>
                <p className="text-gray-500 text-sm mb-4">By {article.authorName || 'Anonymous'}</p>
                <p className="text-gray-700 line-clamp-3">{article.content}</p>
                <a href={`/article/${index}`} className="text-green-600 hover:underline mt-4 inline-block">Read More</a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No articles available yet. Be the first to contribute!</p>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ArticleForm onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}

export default App;